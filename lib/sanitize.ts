// Strip anything HTML-ish from user text before it is stored or rendered.
// React escapes on render too, but suggestions travel as JSON files/emails,
// so scrub at the source as well.

export function sanitizeText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 10000);
}

export function sanitizeMultiline(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .trim()
    .slice(0, 20000);
}

// "YYYY" or "YYYY-MM-DD", else null. Forgiving: trims, accepts bare years.
export function normalizeDate(raw: string): { date: string | null; approx: boolean } {
  const s = raw.trim();
  if (!s) return { date: null, approx: false };
  if (/^\d{4}$/.test(s)) return { date: s, approx: true };
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return { date: s, approx: false };
  const year = s.match(/\b(\d{4})\b/);
  if (year) return { date: year[1], approx: true };
  return { date: null, approx: false };
}
