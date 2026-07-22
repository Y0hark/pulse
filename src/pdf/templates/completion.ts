import type { CompletionReport, CompletionStatus } from '../../dashboard/types.js';
import type { ReportPeriod } from '../../reports/types.js';
import { escapeHtml, renderPdfDocument } from '../theme.js';
import { renderPdfHeader, renderSummary, renderStatGrid, renderTable } from '../partials.js';
import { summarizeCompletion } from '../reportSummary.js';

const STATUS_LABEL: Record<CompletionStatus, string> = { on_time: 'On time', late: 'Late', missing: 'Missing' };
const STATUS_VARIANT: Record<CompletionStatus, string> = { on_time: 'success', late: 'warning', missing: 'danger' };

export interface CompletionPdfMeta {
  teamName: string;
  generatedAt: string;
}

export function renderCompletionPdf(period: ReportPeriod, report: CompletionReport, meta: CompletionPdfMeta): string {
  const bodyHtml = `
    ${renderPdfHeader({
      eyebrow: 'Delay / completion report',
      title: `Submission completion — ${period.isoWeek}`,
      subtitle: "Who submitted on time, who was late, and who's still missing.",
      metaLines: [`Team: ${meta.teamName}`, `Period: ${period.isoWeek}`, `Generated ${new Date(meta.generatedAt).toLocaleString()}`],
    })}
    ${renderSummary(summarizeCompletion(report))}
    ${renderStatGrid([
      { label: 'Completion', value: `${report.summary.completionPct}%` },
      { label: 'On time', value: report.summary.onTime },
      { label: 'Late', value: report.summary.late },
      { label: 'Missing', value: report.summary.missing },
    ])}
    ${renderTable(
      'Submissions',
      [
        { label: 'Member', render: (r: CompletionReport['rows'][number]) => escapeHtml(r.displayName ?? 'Unnamed member') },
        { label: 'Profile', render: (r: CompletionReport['rows'][number]) => escapeHtml(r.profileLabel ?? '—') },
        {
          label: 'Submitted',
          render: (r: CompletionReport['rows'][number]) => escapeHtml(r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '—'),
        },
        {
          label: 'Status',
          align: 'right',
          render: (r: CompletionReport['rows'][number]) =>
            `<span class="pdf-badge pdf-badge--${STATUS_VARIANT[r.status]}">${STATUS_LABEL[r.status]}</span>`,
        },
      ],
      report.rows,
    )}
  `;

  return renderPdfDocument({ title: `Submission completion — ${period.isoWeek}`, bodyHtml });
}
