export const PROFILE_DEFS: { code: string; label: string }[] = [
  { code: 'ba', label: 'BA' },
  { code: 'po', label: 'PO' },
  { code: 'pm', label: 'PM' },
  { code: 'manager', label: 'Manager' },
  { code: 'consultant', label: 'Consultant' },
  { code: 'other', label: 'Other' },
];

export function profileLabelFor(code: string | null): string | null {
  if (!code) return null;
  return PROFILE_DEFS.find((p) => p.code === code)?.label ?? code;
}

/** Sort key for "grouped by profile": known profiles in PROFILE_DEFS order, then
 * anything unrecognized/unassigned last. */
export function profileSortIndex(code: string | null): number {
  if (!code) return PROFILE_DEFS.length;
  const idx = PROFILE_DEFS.findIndex((p) => p.code === code);
  return idx === -1 ? PROFILE_DEFS.length : idx;
}
