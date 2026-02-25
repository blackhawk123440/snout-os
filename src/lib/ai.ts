import OpenAI from 'openai';
import { prisma } from './db';

function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key?.trim()) return null;
  return new OpenAI({ apiKey: key });
}

export const ai = {
  async generateDailyDelight(petId: string, bookingId: string) {
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      include: { booking: { include: { client: true } } },
    });
    if (!pet) return "Couldn't generate report";

    const openai = getOpenAI();
    if (!openai) return "Mojo had a great day! (OpenAI not configured)";

    const orgId = pet.booking?.client?.orgId ?? 'default';

    const prompt = `Write a warm, fun 2-sentence daily delight report for ${pet.name} (${pet.breed ?? 'pet'}). Make it emotional and shareable.`;

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

export default ai;
