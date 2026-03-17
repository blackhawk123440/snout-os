import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { calculateBookingPrice } from '@/lib/pricing/calculate-price';

const CalcSchema = z.object({
  orgId: z.string().optional(),
  service: z.string().min(1),
  startAt: z.string(),
  endAt: z.string(),
  petCount: z.number().min(1).default(1),
  afterHours: z.boolean().default(false),
  holiday: z.boolean().default(false),
  discountCode: z.string().optional(),
  hoursNotice: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CalcSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

    const d = parsed.data;
    const result = await calculateBookingPrice({
      orgId: d.orgId || 'default',
      service: d.service,
      startAt: new Date(d.startAt),
      endAt: new Date(d.endAt),
      petCount: d.petCount,
      afterHours: d.afterHours,
      holiday: d.holiday,
      discountCode: d.discountCode,
      hoursNotice: d.hoursNotice,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Calculation failed', message }, { status: 500 });
  }
}
