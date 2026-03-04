/**
 * Strip emojis from a string (for client-facing previews only).
 * Does NOT mutate stored content; use only when rendering preview text.
 * Uses Unicode ranges for emoji and symbols.
 */
export function stripEmojisFromPreview(text: string): string {
  if (typeof text !== 'string') return '';
  return text
    .replace(
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}]/gu,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();
}
