import OpenAI from 'openai';
import { prisma } from './db';

function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key?.trim()) return null;
  return new OpenAI({ apiKey: key });
}

export const ai = {
  async generateDailyDelight(petId: string, bookingId: string, tone?: 'warm' | 'playful' | 'professional') {
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      include: { booking: { include: { client: true } } },
    });
    if (!pet) return "Couldn't generate report";

    const openai = getOpenAI();
    if (!openai) return "Mojo had a great day! (OpenAI not configured)";

    const orgId = pet.booking?.client?.orgId ?? 'default';

    const tonePrompt =
      tone === 'playful'
        ? 'Write a playful, fun 2-sentence daily delight report. Use light humor and energy.'
        : tone === 'professional'
          ? 'Write a concise, professional 2-sentence daily delight report. Keep it informative and reassuring.'
          : 'Write a warm, fun 2-sentence daily delight report. Make it emotional and shareable.';

    const prompt = `${tonePrompt} For ${pet.name} (${pet.breed ?? 'pet'}).`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });

    const report = completion.choices[0]?.message?.content ?? "Mojo had a great day!";

    await prisma.petHealthLog.create({
      data: {
        petId,
        orgId,
        note: report,
        type: 'daily',
      },
    });

    return report;
  },

  async matchSitterToPet(petId: string, availableSitters: { id: string; [key: string]: unknown }[]) {
    const pet = await prisma.pet.findUnique({ where: { id: petId } });
    if (!pet || availableSitters.length === 0) return null;

    const openai = getOpenAI();
    if (!openai) return availableSitters[0]?.id ?? null;

    const energyHint = pet.notes ?? 'moderate';
    const prompt = `Rank these sitter IDs for a ${pet.breed ?? 'pet'} that needs ${energyHint} energy. Sitter IDs: ${availableSitters.map((s) => s.id).join(', ')}. Return only the best sitter ID.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });

    const bestId = completion.choices[0]?.message?.content?.trim();
    return availableSitters.find((s) => s.id === bestId)?.id ?? availableSitters[0]?.id ?? null;
  },

  // dynamic pricing, sentiment analysis, predictive alerts — all here
};

export interface SitterSuggestion {
  sitterId: string;
  firstName: string;
  lastName: string;
  score: number;
  reasons: string[];
}

/**
 * Get AI-ranked sitter suggestions for a booking
 */
export async function getSitterSuggestionsForBooking(
  bookingId: string,
  orgId: string
): Promise<SitterSuggestion[]> {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, orgId },
    include: {
      pets: true,
      timeSlots: true,
      sitter: true,
    },
  });

  if (!booking) return [];

  const sitters = await prisma.sitter.findMany({
    where: { orgId, active: true },
    select: { id: true, firstName: true, lastName: true },
  });

  if (sitters.length === 0) return [];

  const openai = getOpenAI();
  if (!openai) {
    return sitters.slice(0, 5).map((s, i) => ({
      sitterId: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      score: 100 - i * 10,
      reasons: ['Available sitter'],
    }));
  }

  const petBreeds = booking.pets.map((p) => p.breed || p.species).join(', ');
  const petNotes = booking.pets.map((p) => p.notes).filter(Boolean).join('; ') || 'none';
  const sitterList = sitters.map((s) => `${s.id}: ${s.firstName} ${s.lastName}`).join('\n');

  const prompt = `You are matching sitters to a pet care booking.
Booking: ${booking.service}, pets: ${petBreeds}. Pet notes: ${petNotes}.
Available sitters:
${sitterList}

Return a JSON array of objects: [{ "sitterId": "uuid", "score": 0-100, "reasons": ["reason1", "reason2"] }]
Rank by: fit for breed/energy, proximity (if known), history. Return max 5. Only valid sitter IDs.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0]?.message?.content ?? '{}';
  let parsed: { suggestions?: Array<{ sitterId: string; score: number; reasons: string[] }> };
  try {
    parsed = JSON.parse(raw);
    if (!parsed.suggestions) parsed = { suggestions: [parsed as any] };
  } catch {
    parsed = { suggestions: [] };
  }

  const suggestions = (parsed.suggestions || []).slice(0, 5).map((s) => {
    const sitter = sitters.find((x) => x.id === s.sitterId) ?? sitters[0];
    return {
      sitterId: sitter.id,
      firstName: sitter.firstName,
      lastName: sitter.lastName,
      score: typeof s.score === 'number' ? s.score : 80,
      reasons: Array.isArray(s.reasons) ? s.reasons : ['Good match'],
    };
  });

  return suggestions;
}

/**
 * Deterministic revenue forecast (moving average) + optional AI commentary.
 * Returns fast; AI commentary only when includeAi=true (don't block on OpenAI).
 */
export async function getRevenueForecast(
  orgId: string,
  rangeDays: number = 90,
  includeAi: boolean = false
): Promise<{ daily: { date: string; amount: number }[]; aiCommentary: string }> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - rangeDays);

  const bookings = await prisma.booking.findMany({
    where: {
      orgId,
      status: 'completed',
      paymentStatus: 'paid',
      startAt: { gte: start, lte: end },
    },
    select: { startAt: true, totalPrice: true },
  });

  const byDate = new Map<string, number>();
  for (const b of bookings) {
    const d = b.startAt.toISOString().slice(0, 10);
    byDate.set(d, (byDate.get(d) ?? 0) + b.totalPrice);
  }

  const sortedDates = [...byDate.keys()].sort();
  const daily = sortedDates.map((date) => ({
    date,
    amount: byDate.get(date) ?? 0,
  }));

  const total = daily.reduce((s, d) => s + d.amount, 0);
  const avgDaily = daily.length > 0 ? total / daily.length : 0;

  let aiCommentary = `Historical average: $${avgDaily.toFixed(2)}/day over ${daily.length} days with revenue.`;
  if (includeAi) {
    const openai = getOpenAI();
    if (openai && daily.length >= 7) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'user',
            content: `Pet care business revenue last ${rangeDays}d: total $${total.toFixed(2)}, ${daily.length} days with revenue. Avg $${avgDaily.toFixed(2)}/day. In 1-2 sentences, give a brief forecast or trend insight.`,
          }],
        });
        aiCommentary = completion.choices[0]?.message?.content ?? aiCommentary;
      } catch {
        // Fallback to deterministic on OpenAI failure
      }
    }
  }

  return { daily, aiCommentary };
}

export default ai;
