import { normalizeE164 } from '@/lib/messaging/phone-utils';

type MinimalDb = {
  messageNumber: {
    findFirst: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
  };
};

export async function upsertCanonicalMessageNumbersFromTwilio(
  db: MinimalDb,
  orgId: string,
  numbers: Array<{ sid: string; phoneNumber?: string }>
): Promise<number> {
  let index = 0;
  for (const n of numbers) {
    const e164 = normalizeE164((n.phoneNumber || '').toString());
    const numberClass = index === 0 ? 'front_desk' : 'pool';
    const existing = await db.messageNumber.findFirst({
      where: { orgId, OR: [{ e164 }, { providerNumberSid: n.sid }] },
    });
    if (existing) {
      await db.messageNumber.update({
        where: { id: existing.id },
        data: {
          e164,
          status: 'active',
          numberClass,
          provider: 'twilio',
          providerNumberSid: n.sid,
        },
      });
    } else {
      await db.messageNumber.create({
        data: {
          orgId,
          e164,
          numberClass,
          status: 'active',
          provider: 'twilio',
          providerNumberSid: n.sid,
        },
      });
    }
    index++;
  }
  return numbers.length;
}

