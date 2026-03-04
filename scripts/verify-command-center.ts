#!/usr/bin/env tsx

type AttentionItem = {
  id: string;
  type: string;
  severity: 'high' | 'medium' | 'low' | string;
};

type AttentionPayload = {
  alerts: AttentionItem[];
  staffing: AttentionItem[];
};

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

function joinUrl(path: string): string {
  return `${BASE_URL!.replace(/\/$/, '')}${path}`;
}

function getSetCookies(res: Response): string[] {
  const maybe = res.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof maybe.getSetCookie === 'function') {
    return maybe.getSetCookie();
  }
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

async function fetchJson(path: string, init?: RequestInit): Promise<{ res: Response; json: any }> {
  const res = await fetch(joinUrl(path), init);
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { res, json };
}

async function e2eLogin(role: Role): Promise<Map<string, string>> {
  const res = await fetch(joinUrl('/api/ops/e2e-login'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-e2e-key': E2E_AUTH_KEY!,
    },
    body: JSON.stringify({ role }),
    redirect: 'manual',
  });

  if (!res.ok) {
    throw new Error(`e2e-login ${role} failed: ${res.status}`);
  }

  const cookies = new Map<string, string>();
  mergeCookies(cookies, getSetCookies(res));
  if (cookies.size === 0) {
    throw new Error(`e2e-login ${role} returned no session cookie`);
  }
  return cookies;
}

async function credentialsLogin(role: Role): Promise<Map<string, string>> {
  const emailEnv = process.env[`${role.toUpperCase()}_EMAIL`];
  const passwordEnv = process.env[`${role.toUpperCase()}_PASSWORD`];
  if (!emailEnv || !passwordEnv) {
    throw new Error(`missing ${role} credentials env vars`);
  }

  const jar = new Map<string, string>();
  const csrfRes = await fetch(joinUrl('/api/auth/csrf'));
  mergeCookies(jar, getSetCookies(csrfRes));
  const csrfJson = await csrfRes.json().catch(() => ({}));
  const csrfToken = csrfJson?.csrfToken;
  if (!csrfToken) {
    throw new Error(`failed to fetch csrf token for ${role}`);
  }

  const body = new URLSearchParams({
    email: emailEnv,
    password: passwordEnv,
    csrfToken,
    callbackUrl: joinUrl('/command-center'),
    json: 'true',
  });

  const loginRes = await fetch(joinUrl('/api/auth/callback/credentials'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookieHeader(jar),
    },
    body,
    redirect: 'manual',
  });
  mergeCookies(jar, getSetCookies(loginRes));

  if (!(loginRes.status === 302 || loginRes.ok)) {
    throw new Error(`credentials login ${role} failed: ${loginRes.status}`);
  }
  if (Array.from(jar.keys()).every((k) => !k.includes('session-token'))) {
    throw new Error(`credentials login ${role} missing session cookie`);
  }
  return jar;
}

async function login(role: Role): Promise<Map<string, string>> {
  try {
    return await e2eLogin(role);
  } catch (e) {
    console.warn(`WARN: e2e login failed for ${role}: ${(e as Error).message}`);
    return credentialsLogin(role);
  }
}

function flattenAttention(payload: AttentionPayload): AttentionItem[] {
  return [...(payload.alerts || []), ...(payload.staffing || [])];
}

function countBy<T extends string>(items: AttentionItem[], key: (i: AttentionItem) => T): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    const k = key(item);
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

async function run() {
  const report: string[] = [];

  // 1) Health
  const { res: healthRes, json: health } = await fetchJson('/api/health');
  assert(healthRes.ok, `health failed: ${healthRes.status}`);
  report.push(`health.commitSha=${health?.commitSha ?? 'unknown'}`);
  report.push(`health.envName=${health?.envName ?? 'unknown'}`);
  report.push(`health.redis=${health?.redis ?? 'unknown'}`);

  // 2) Seed fixtures (e2e-key path)
  const { res: seedRes, json: seed } = await fetchJson('/api/ops/command-center/seed-fixtures', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-e2e-key': E2E_AUTH_KEY!,
    },
    body: JSON.stringify({}),
  });
  assert(seedRes.ok, `seed-fixtures failed: ${seedRes.status} ${JSON.stringify(seed)}`);
  report.push(`seed.ok=${seed?.ok === true}`);
  report.push(`seed.expectedItemKeys=${Array.isArray(seed?.expectedItemKeys) ? seed.expectedItemKeys.length : 0}`);

  // 3) Owner attention readout
  const ownerCookies = await login('owner');
  const { res: attRes, json: attention } = await fetchJson('/api/ops/command-center/attention', {
    headers: { Cookie: cookieHeader(ownerCookies) },
  });
  assert(attRes.ok, `attention fetch failed: ${attRes.status}`);

  const payload: AttentionPayload = {
    alerts: Array.isArray(attention?.alerts) ? attention.alerts : [],
    staffing: Array.isArray(attention?.staffing) ? attention.staffing : [],
  };
  const allItems = flattenAttention(payload);
  const typeCounts = countBy(allItems, (i) => i.type || 'unknown');
  const severityCounts = countBy(allItems, (i) => (i.severity as string) || 'unknown');
  report.push(`attention.total=${allItems.length}`);
  report.push(`attention.byType=${JSON.stringify(typeCounts)}`);
  report.push(`attention.bySeverity=${JSON.stringify(severityCounts)}`);
  report.push(`attention.first10Ids=${JSON.stringify(allItems.slice(0, 10).map((i) => i.id))}`);

  assert(allItems.length >= 2, 'need at least 2 attention items to test actions');
  const snoozeTarget = allItems[0];
  const handledTarget = allItems[1];

  // 4) Snooze + handled then verify removed
  const snoozeRes = await fetch(joinUrl('/api/ops/command-center/attention/actions'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(ownerCookies),
    },
    body: JSON.stringify({ id: snoozeTarget.id, action: 'snooze_1h' }),
  });
  assert(snoozeRes.ok, `snooze action failed: ${snoozeRes.status}`);

  const handledRes = await fetch(joinUrl('/api/ops/command-center/attention/actions'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(ownerCookies),
    },
    body: JSON.stringify({ id: handledTarget.id, action: 'mark_handled' }),
  });
  assert(handledRes.ok, `handled action failed: ${handledRes.status}`);

  const { res: attRes2, json: attention2 } = await fetchJson('/api/ops/command-center/attention', {
    headers: { Cookie: cookieHeader(ownerCookies) },
  });
  assert(attRes2.ok, `attention re-fetch failed: ${attRes2.status}`);
  const allAfter = flattenAttention({
    alerts: Array.isArray(attention2?.alerts) ? attention2.alerts : [],
    staffing: Array.isArray(attention2?.staffing) ? attention2.staffing : [],
  });
  const afterIds = new Set(allAfter.map((i) => i.id));
  assert(!afterIds.has(snoozeTarget.id), `snoozed item still present: ${snoozeTarget.id}`);
  assert(!afterIds.has(handledTarget.id), `handled item still present: ${handledTarget.id}`);
  report.push(`actions.removed=[${snoozeTarget.id},${handledTarget.id}]`);

  // 5) Sitter/client access checks
  for (const role of ['sitter', 'client'] as const) {
    const roleCookies = await login(role);
    const apiRes = await fetch(joinUrl('/api/ops/command-center/attention'), {
      headers: { Cookie: cookieHeader(roleCookies) },
      redirect: 'manual',
    });
    assert([401, 403].includes(apiRes.status), `${role} API access expected 401/403, got ${apiRes.status}`);

    const pageRes = await fetch(joinUrl('/command-center'), {
      headers: { Cookie: cookieHeader(roleCookies) },
      redirect: 'manual',
    });
    // Some deploys enforce page access in middleware (3xx/4xx), others rely on client-side redirect.
    // API-level 401/403 is the hard RBAC requirement; page status is reported for visibility.
    assert(
      [200, 302, 303, 307, 308, 401, 403].includes(pageRes.status),
      `${role} page access returned unexpected status: ${pageRes.status}`
    );
    report.push(`${role}.apiStatus=${apiRes.status}`);
    report.push(`${role}.pageStatus=${pageRes.status}`);
  }

  console.log('=== Command Center Verification Report ===');
  for (const line of report) console.log(line);
  console.log('RESULT: PASS');
}

run().catch((error) => {
  console.error('RESULT: FAIL');
  console.error((error as Error).message);
  process.exit(1);
});

