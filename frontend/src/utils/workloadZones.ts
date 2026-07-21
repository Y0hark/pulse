export interface WorkloadZone {
  label: string;
  emoji: string;
  color: string;
}

const ZONES: { max: number; zone: WorkloadZone }[] = [
  { max: 25, zone: { label: 'Low', emoji: '🟦', color: 'var(--color-info)' } },
  { max: 60, zone: { label: 'Steady', emoji: '🟩', color: 'var(--color-success)' } },
  { max: 85, zone: { label: 'High', emoji: '🟧', color: 'var(--color-warning)' } },
  { max: 100, zone: { label: 'Critical', emoji: '🟥', color: 'var(--color-danger)' } },
];

export function workloadZoneFor(value: number): WorkloadZone {
  return (ZONES.find((z) => value <= z.max) ?? ZONES[ZONES.length - 1]).zone;
}
