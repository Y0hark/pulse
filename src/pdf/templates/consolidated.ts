import type { ConsolidatedReport } from '../../dashboard/types.js';
import type { ReportPeriod } from '../../reports/types.js';
import { escapeHtml, renderPdfDocument } from '../theme.js';
import { renderAlertList, renderPdfHeader, renderStatGrid, renderSummary, renderTable } from '../partials.js';
import { summarizeConsolidated } from '../reportSummary.js';

export interface ConsolidatedPdfMeta {
  generatedAt: string;
}

export function renderConsolidatedPdf(period: ReportPeriod, report: ConsolidatedReport, meta: ConsolidatedPdfMeta): string {
  const bodyHtml = `
    ${renderPdfHeader({
      eyebrow: 'Consolidated report',
      title: `Across missions — ${period.isoWeek}`,
      subtitle: 'Rolled up across every active mission for this period.',
      metaLines: [`Period: ${period.isoWeek}`, `Generated ${new Date(meta.generatedAt).toLocaleString()}`],
    })}
    ${renderSummary(summarizeConsolidated(report))}
    ${renderStatGrid([
      { label: 'Active missions', value: report.totals.missionCount },
      { label: 'Headcount', value: report.totals.headcount },
      { label: 'Completion', value: `${report.totals.completionPct}%` },
      { label: 'Mean workload', value: report.totals.meanWorkload },
      { label: 'Delivered', value: report.totals.totalDelivered },
      { label: 'In-flight', value: report.totals.totalInFlight },
    ])}
    ${renderTable(
      'By mission',
      [
        { label: 'Mission', render: (m: ConsolidatedReport['missions'][number]) => escapeHtml(m.missionName) },
        { label: 'Headcount', align: 'right', render: (m: ConsolidatedReport['missions'][number]) => String(m.headcount) },
        { label: 'Completion', align: 'right', render: (m: ConsolidatedReport['missions'][number]) => `${m.completionPct}%` },
        { label: 'Mean workload', align: 'right', render: (m: ConsolidatedReport['missions'][number]) => String(m.meanWorkload) },
        { label: 'Delivered', align: 'right', render: (m: ConsolidatedReport['missions'][number]) => String(m.totalDelivered) },
        { label: 'In-flight', align: 'right', render: (m: ConsolidatedReport['missions'][number]) => String(m.totalInFlight) },
      ],
      report.missions,
    )}
    ${renderAlertList('Top alerts', report.topAlerts)}
  `;

  return renderPdfDocument({ title: `Consolidated report — ${period.isoWeek}`, bodyHtml });
}
