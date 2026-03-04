/**
 * Strip emojis and playful symbols from a string (for client-facing previews only).
 * Does NOT mutate stored content; use only when rendering preview text.
 * Covers hearts, faces, symbols, and variation selectors.
 */
export function stripEmojisFromPreview(text: string): string {
  if (typeof text !== 'string') return '';
  return text
    .replace(
      // Emoji and symbols: hearts (♥ 2665, ❤ 2764, ❣ 2763, 1F493-1F49F), faces, misc, variation selectors
      /[\u2665\u2763-\u2767\u{1F493}-\u{1F49F}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}]/gu,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();
}
