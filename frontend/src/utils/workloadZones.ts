export interface WorkloadZone {
  label: string;
  emoji: string;
  color: string;
}

const ZONES: { max: number; zone: WorkloadZone }[] = [
  { max: 25, zone: { label: 'Low', emoji: '🟦', color: '#3b82f6' } },
  { max: 60, zone: { label: 'Steady', emoji: '🟩', color: '#22c55e' } },
  { max: 85, zone: { label: 'High', emoji: '🟧', color: '#f97316' } },
  { max: 100, zone: { label: 'Critical', emoji: '🟥', color: '#ef4444' } },
];

export function workloadZoneFor(value: number): WorkloadZone {
  return (ZONES.find((z) => value <= z.max) ?? ZONES[ZONES.length - 1]).zone;
}
