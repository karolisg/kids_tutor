export function field(body: Record<string, string | File>, name: string): string {
  const value = body[name];
  return typeof value === 'string' ? value : '';
}

export function cleanEmail(input: string): string | null {
  const email = input.trim().toLowerCase();
  if (email.length < 3 || email.length > 200) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function cleanPassword(input: string): string | null {
  if (input.length < 8 || input.length > 200) return null;
  return input;
}

export function cleanName(input: string): string | null {
  const name = input.trim().replace(/\s+/g, ' ');
  if (name.length < 1 || name.length > 40) return null;
  if (/[\u0000-\u001F\u007F]/.test(name)) return null;
  return name;
}

export function cleanPin(input: string): string | null {
  const pin = input.trim();
  if (!/^\d{4,6}$/.test(pin)) return null;
  return pin;
}

export function cleanCount(input: string): number | null {
  if (!/^\d+$/.test(input.trim())) return null;
  const count = Number(input.trim());
  if (!Number.isInteger(count) || count < 1 || count > 20) return null;
  return count;
}

/** Whole-number answers, including a leading minus for hard subtraction. */
export function parseIntegerAnswer(input: string): number | null {
  const trimmed = input.trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value)) return null;
  return value;
}
