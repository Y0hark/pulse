import type { DashboardAggregate } from '../../dashboard/types.js';
import type { ReportPeriod } from '../../reports/types.js';
import { escapeHtml, renderPdfDocument } from '../theme.js';
import { renderAlertList, renderBarRow, renderPdfHeader, renderStatGrid, renderSummary, renderTable } from '../partials.js';
import { summarizeDashboard } from '../reportSummary.js';

const HEALTH_LABEL: Record<string, string> = { good: 'Good', at_risk: 'At risk', blocked: 'Blocked' };
const BUCKET_LABEL: Record<string, string> = { low: 'Low', steady: 'Steady', high: 'High', critical: 'Critical' };

export interface SnapshotPdfMeta {
  frozenAt: string | null;
}

export function renderSnapshotPdf(period: ReportPeriod, aggregate: DashboardAggregate, meta: SnapshotPdfMeta): string {
  const { submitted, pending } = aggregate.submissionStatus;
  const maxBucketCount = Math.max(1, ...aggregate.workload.distribution.map((d) => d.count));

  const bodyHtml = `
    ${renderPdfHeader({
      eyebrow: 'Historical report',
      title: `Team snapshot — ${period.isoWeek}`,
      subtitle: meta.frozenAt ? `Frozen ${new Date(meta.frozenAt).toLocaleString()} · data is immutable` : undefined,
      metaLines: [`Period: ${period.isoWeek}`],
    })}
    ${renderSummary(summarizeDashboard(aggregate))}
    ${renderStatGrid([
      { label: 'Submitted', value: `${submitted.length} / ${submitted.length + pending.length}` },
      { label: 'Mean workload', value: aggregate.workload.mean },
      { label: 'Total delivered', value: aggregate.totalDelivered },
      { label: 'Total in-flight', value: aggregate.totalInFlight },
    ])}

    <section class="pdf-section">
      <div class="pdf-card">
        <h3 class="pdf-card__header">Workload</h3>
        ${renderBarRow('Mean', aggregate.workload.mean, 100)}
        ${renderBarRow('Max', aggregate.workload.max, 100)}
        ${renderBarRow('Min', aggregate.workload.min, 100)}
        <div style="margin-top:10px;">
          ${aggregate.workload.distribution
            .map((d) => renderBarRow(BUCKET_LABEL[d.bucket] ?? d.bucket, d.count, maxBucketCount))
            .join('')}
        </div>
      </div>
    </section>

    <section class="pdf-section">
      <div class="pdf-card">
        <h3 class="pdf-card__header">Project health</h3>
        <div class="pdf-stat-grid" style="margin:0;">
          ${(['good', 'at_risk', 'blocked'] as const)
            .map(
              (status) => `
            <div class="pdf-stat-card">
              <p class="pdf-stat-card__label">${HEALTH_LABEL[status]}</p>
              <p class="pdf-stat-card__value">${aggregate.projectHealth[status]}</p>
            </div>`,
            )
            .join('')}
        </div>
      </div>
    </section>

    ${renderTable(
      'By profile',
      [
        { label: 'Profile', render: (p: DashboardAggregate['byProfile'][number]) => escapeHtml(p.label) },
        { label: 'Headcount', align: 'right', render: (p: DashboardAggregate['byProfile'][number]) => String(p.headcount) },
        { label: 'Mean workload', align: 'right', render: (p: DashboardAggregate['byProfile'][number]) => String(p.meanWorkload) },
        { label: 'Delivered', align: 'right', render: (p: DashboardAggregate['byProfile'][number]) => String(p.delivered) },
      ],
      aggregate.byProfile,
    )}

    ${renderAlertList('Top alerts', aggregate.alerts.slice(0, 5))}

    ${
      aggregate.opportunities.length
        ? `
    <section class="pdf-section">
      <div class="pdf-card">
        <h3 class="pdf-card__header">Opportunities</h3>
        <ul class="pdf-alert-list">
          ${aggregate.opportunities
            .slice(0, 5)
            .map((o) => `<li><span>${escapeHtml(o.content)}</span></li>`)
            .join('')}
        </ul>
      </div>
    </section>`
        : ''
    }
  `;

  return renderPdfDocument({ title: `Team snapshot — ${period.isoWeek}`, bodyHtml });
}
