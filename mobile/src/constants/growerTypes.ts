// Stored as-is in profiles.grower_type; the backend uses it to scale advice
// (per pot, per garden bed or per acre).
export const GROWER_TYPES = ['pots', 'home_garden', 'fields'] as const;

export type GrowerType = (typeof GROWER_TYPES)[number];

export function isGrowerType(value: unknown): value is GrowerType {
  return typeof value === 'string' && (GROWER_TYPES as readonly string[]).includes(value);
}
