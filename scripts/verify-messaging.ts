#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

type Role = 'owner' | 'sitter' | 'client';

const BASE_URL = process.env.BASE_URL;
const E2E_AUTH_KEY = process.env.E2E_AUTH_KEY;

if (!BASE_URL) {
  console.error('FAIL: BASE_URL is required');
  process.exit(1);
}
if (!E2E_AUTH_KEY) {
  console.error('FAIL: E2E_AUTH_KEY is required');
  process.exit(1);
}

const prisma = new PrismaClient();

function joinUrl(path: string): string {
  return `${BASE_URL!.replace(/\/$/, '')}${path}`;
}

function getSetCookies(res: Response): string[] {
  const maybe = res.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof maybe.getSetCookie === 'function') return maybe.getSetCookie();
  const single = res.headers.get('set-cookie');
  return single ? [single] : [];
}

function parseCookiePair(setCookie: string): { name: string; value: string } | null {
  const first = setCookie.split(';')[0];
  const eq = first.indexOf('=');
  if (eq <= 0) return null;
  return { name: first.slice(0, eq), value: first.slice(eq + 1) };
}

function mergeCookies(target: Map<string, string>, setCookies: string[]) {
  for (const raw of setCookies) {
    const parsed = parseCookiePair(raw);
    if (parsed) target.set(parsed.name, parsed.value);
  }
}

function cookieHeader(cookies: Map<string, string>): string {
  return Array.from(cookies.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

async function fetchJson(path: string, init?: RequestInit): Promise<{ res: Response; json: any; text: string }> {
  const res = await fetch(joinUrl(path), init);
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { res, json, text };
}

async function login(role: Role): Promise<Map<string, string>> {
  const res = await fetch(joinUrl('/api/ops/e2e-login'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-e2e-key': E2E_AUTH_KEY!,
    },
    body: JSON.stringify({ role }),
    redirect: 'manual',
  });
  if (!res.ok) throw new Error(`e2e-login ${role} failed: ${res.status}`);
  const cookies = new Map<string, string>();
  mergeCookies(cookies, getSetCookies(res));
  if (!cookies.size) throw new Error(`e2e-login ${role} returned no cookie`);
  return cookies;
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

async function run() {
  const report: string[] = [];
  const runId = `msg-${Date.now().toString(36)}`;

  const health = await fetchJson('/api/health');
  assert(health.res.ok, `health failed ${health.res.status}`);
  report.push(`health.commitSha=${health.json?.commitSha ?? 'unknown'}`);
  report.push(`health.envName=${health.json?.envName ?? 'unknown'}`);

  const ownerCookies = await login('owner');
  const sitterCookies = await login('sitter');
  const clientCookies = await login('client');

  const ownerUser = await prisma.user.findFirst({
    where: { role: 'owner' },
    select: { id: true, orgId: true },
  });
  const sitterUser = await prisma.user.findFirst({
    where: { role: 'sitter', sitterId: { not: null } },
    select: { id: true, sitterId: true, orgId: true },
  });
  const clientUser = await prisma.user.findFirst({
    where: { role: 'client', clientId: { not: null } },
    select: { id: true, clientId: true, orgId: true },
  });
  assert(ownerUser && sitterUser && clientUser, 'owner/sitter/client users missing');
  assert(ownerUser.orgId === sitterUser.orgId && ownerUser.orgId === clientUser.orgId, 'cross-org test users');
  const orgId = ownerUser.orgId;

  const sitter = await prisma.sitter.findUnique({
    where: { id: sitterUser.sitterId! },
    select: { id: true },
  });
  const client = await prisma.client.findUnique({
    where: { id: clientUser.clientId! },
    select: { id: true, phone: true },
  });
  assert(sitter && client, 'sitter/client records missing');

  const now = Date.now();
  const fallbackPhone = `+1555${String(now).slice(-7)}`;
  const clientPhone = client.phone?.startsWith('+') ? client.phone : fallbackPhone;
  await prisma.client.update({
    where: { id: client.id },
    data: { phone: clientPhone },
  });
  await prisma.$executeRawUnsafe(
    'INSERT INTO "ClientContact" ("id","orgId","clientId","e164","label","verified","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,now(),now()) ON CONFLICT ("orgId","e164") DO UPDATE SET "clientId" = EXCLUDED."clientId", "updatedAt" = now()',
    `contact_${runId}`,
    orgId,
    client.id,
    clientPhone,
    'Mobile',
    true
  );

  let number = await prisma.messageNumber.findFirst({
    where: { orgId, numberClass: 'front_desk', status: 'active' },
    select: { id: true, e164: true, numberClass: true },
  });
  if (!number) {
    number = await prisma.messageNumber.create({
      data: {
        orgId,
        e164: `+1555${String(now + 1).slice(-7)}`,
        numberClass: 'front_desk',
        status: 'active',
        provider: 'twilio',
        providerNumberSid: `PN_${runId}`,
      },
      select: { id: true, e164: true, numberClass: true },
    });
  }

  const booking = await prisma.booking.create({
    data: {
      orgId,
      firstName: 'Verify',
      lastName: 'Messaging',
      phone: clientPhone,
      service: 'Walk',
      startAt: new Date(now - 5 * 60 * 1000),
      endAt: new Date(now + 60 * 60 * 1000),
      totalPrice: 10,
      status: 'confirmed',
      clientId: client.id,
      sitterId: sitter.id,
    },
    select: { id: true },
  });

  const thread = await prisma.messageThread.create({
    data: {
      orgId,
      bookingId: booking.id,
      clientId: client.id,
      assignedSitterId: sitter.id,
      messageNumberId: number.id,
      numberClass: number.numberClass,
      maskedNumberE164: number.e164,
      scope: 'client_booking',
      threadType: 'assignment',
      status: 'open',
    },
    select: { id: true },
  });

  await prisma.assignmentWindow.create({
    data: {
      orgId,
      threadId: thread.id,
      bookingId: booking.id,
      sitterId: sitter.id,
      startAt: new Date(now - 5 * 60 * 1000),
      endAt: new Date(now + 30 * 60 * 1000),
      status: 'active',
    },
  });
  report.push(`seed.threadId=${thread.id}`);

  const inboundSid = `SM_${runId}`;
  const inbound = await fetchJson('/api/messages/webhook/twilio', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'x-twilio-signature': 'verify-messaging',
    },
    body: `From=${encodeURIComponent(clientPhone)}&To=${encodeURIComponent(number.e164)}&Body=${encodeURIComponent(
      `inbound ${runId}`
    )}&MessageSid=${encodeURIComponent(inboundSid)}`,
  });
  assert(inbound.res.status === 200, `inbound webhook failed ${inbound.res.status}`);

  const inboundStored = await prisma.messageEvent.findFirst({
    where: { orgId, providerMessageSid: inboundSid },
    select: { id: true, threadId: true, direction: true },
  });
  assert(!!inboundStored, 'inbound event not stored');
  report.push(`inbound.event=${inboundStored?.id}`);

  const ownerSend = await fetchJson(`/api/messages/threads/${thread.id}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(ownerCookies),
    },
    body: JSON.stringify({ body: `owner reply ${runId}` }),
  });
  assert(ownerSend.res.status === 200 || ownerSend.res.status === 500, `owner send unexpected ${ownerSend.res.status}`);
  assert(ownerSend.json?.messageId, 'owner messageId missing');

  const sitterSend = await fetchJson(`/api/sitter/threads/${thread.id}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(sitterCookies),
    },
    body: JSON.stringify({ body: `sitter reply ${runId}` }),
  });
  assert(
    sitterSend.res.status === 200 || sitterSend.res.status === 500,
    `sitter send unexpected ${sitterSend.res.status}`
  );
  assert(sitterSend.json?.messageId, 'sitter messageId missing');

  const clientSend = await fetchJson(`/api/client/messages/${thread.id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(clientCookies),
    },
    body: JSON.stringify({ body: `client reply ${runId}` }),
  });
  assert(clientSend.res.status === 200, `client send failed ${clientSend.res.status}`);

  const ownerRead = await fetchJson(`/api/messages/threads/${thread.id}`, {
    headers: { Cookie: cookieHeader(ownerCookies) },
  });
  assert(ownerRead.res.ok, 'owner cannot read thread');
  const sitterRead = await fetchJson(`/api/sitter/threads`, {
    headers: { Cookie: cookieHeader(sitterCookies) },
  });
  assert(sitterRead.res.ok, 'sitter thread list failed');
  const sitterHasThread = Array.isArray(sitterRead.json) && sitterRead.json.some((t: any) => t.id === thread.id);
  assert(sitterHasThread, 'sitter cannot see assigned thread');

  const clientRead = await fetchJson('/api/client/messages', {
    headers: { Cookie: cookieHeader(clientCookies) },
  });
  assert(clientRead.res.ok, 'client thread list failed');
  const clientHasThread = Array.isArray(clientRead.json?.threads) && clientRead.json.threads.some((t: any) => t.id === thread.id);
  assert(clientHasThread, 'client cannot see own thread');

  const deprecatedInbound = await fetchJson('/api/twilio/inbound', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'From=%2B15550001111&To=%2B15550002222&Body=legacy',
  });
  assert(deprecatedInbound.res.status === 410, 'legacy inbound route is still active');

  const events = await prisma.messageEvent.findMany({
    where: { orgId, threadId: thread.id },
    orderBy: { createdAt: 'asc' },
    select: { id: true, actorType: true, direction: true, deliveryStatus: true },
  });
  assert(events.length >= 4, `expected >=4 events, got ${events.length}`);
  report.push(`events.count=${events.length}`);

  console.log('VERIFY MESSAGING REPORT');
  for (const line of report) console.log(`- ${line}`);
  console.log('RESULT: PASS');
}

run()
  .catch((error) => {
    console.error('RESULT: FAIL');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });
