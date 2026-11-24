// Small helpers for validating request input.

/** A positive integer id, given as a number or a digit string. */
export const isId = (v: unknown): boolean =>
  (typeof v === 'number' && Number.isInteger(v) && v > 0) ||
  (typeof v === 'string' && /^[1-9]\d{0,15}$/.test(v));

/** Escape %, _ and \ so user input matches literally inside ILIKE '%…%'. */
export const escapeLike = (s: string): string => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Today's date in India (YYYY-MM-DD), whatever timezone the server runs in. */
export const todayInIndia = (offsetDays = 0): string => {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
};
