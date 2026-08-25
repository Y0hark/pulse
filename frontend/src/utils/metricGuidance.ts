export interface MetricGuidance {
  deliveredLabel: string;
  inflightLabel: string;
  description: string;
}

const DEFAULT_METRIC_GUIDANCE: MetricGuidance = {
  deliveredLabel: 'Delivered',
  inflightLabel: 'In-flight',
  description: 'Items you completed this week vs. items still open or in progress.',
};

/**
 * Mirrors src/dashboard/profiles.ts metricGuidanceFor on the backend: "delivered" and
 * "in-flight" mean something different per job profile (a BA counts tickets, a PO counts
 * tickets and epics, a Scrum Master counts ceremonies and sprints, a PMO counts projects) —
 * this keeps the number tied to what it actually represents instead of being a raw count.
 */
const METRIC_GUIDANCE: Record<string, MetricGuidance> = {
  ba: {
    deliveredLabel: 'Tickets closed',
    inflightLabel: 'Tickets open',
    description: 'Count tickets you closed this week vs. tickets still open or in progress.',
  },
  po: {
    deliveredLabel: 'Tickets & epics delivered',
    inflightLabel: 'Tickets & epics in flight',
    description: 'Count tickets and epics you delivered this week vs. ones still in flight.',
  },
  pm: {
    deliveredLabel: 'Deliverables completed',
    inflightLabel: 'Deliverables in progress',
    description: 'Count deliverables/milestones you completed this week vs. ones still in progress.',
  },
  scrum_master: {
    deliveredLabel: 'Ceremonies run',
    inflightLabel: 'Sprints in progress',
    description: 'Count ceremonies you ran this week vs. sprints currently in progress.',
  },
  pmo: {
    deliveredLabel: 'Projects closed',
    inflightLabel: 'Projects active or blocked',
    description: 'Count projects closed this week vs. projects still active or blocked.',
  },
  manager: {
    deliveredLabel: 'Items closed',
    inflightLabel: 'Items in progress',
    description: 'Count items your team closed this week vs. items still in progress.',
  },
  consultant: DEFAULT_METRIC_GUIDANCE,
  other: DEFAULT_METRIC_GUIDANCE,
};

export function metricGuidanceFor(code: string | null | undefined): MetricGuidance {
  if (!code) return DEFAULT_METRIC_GUIDANCE;
  return METRIC_GUIDANCE[code] ?? DEFAULT_METRIC_GUIDANCE;
}
