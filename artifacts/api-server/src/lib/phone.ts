export function normalizePakistanPhone(value: string): string | null {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = `92${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("3")) digits = `92${digits}`;
  return /^923\d{9}$/.test(digits) ? `+${digits}` : null;
}

export function phoneLookupVariants(value: string, normalized: string | null): string[] {
  const raw = value.trim();
  if (!normalized) return [raw];
  const digits = normalized.slice(1);
  return [...new Set([raw, normalized, digits, `0${digits.slice(2)}`, digits.slice(2)])];
}
