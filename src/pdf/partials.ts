import { escapeHtml } from './theme.js';
import type { AlertSeverity } from '../reports/types.js';

export interface PdfHeaderOptions {
  eyebrow: string;
  title: string;
  subtitle?: string;
  metaLines: string[];
}

export function renderPdfHeader({ eyebrow, title, subtitle, metaLines }: PdfHeaderOptions): string {
  return `
    <div class="pdf-eyebrow">${escapeHtml(eyebrow)}</div>
    <h1 class="pdf-title">${escapeHtml(title)}</h1>
    ${subtitle ? `<p class="pdf-subtitle">${escapeHtml(subtitle)}</p>` : ''}
    <div class="pdf-meta">${metaLines.map((line) => `<span>${escapeHtml(line)}</span>`).join('')}</div>
    <div class="pdf-accent-bar"></div>
  `;
}

export function renderSummary(points: string[]): string {
  const body = points.length
    ? `<ul>${points.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>`
    : `<p class="pdf-summary__empty">Nothing notable to flag this period.</p>`;
  return `
    <section class="pdf-section">
      <h2 class="pdf-section__title">Executive summary</h2>
      <div class="pdf-summary">${body}</div>
    </section>
  `;
}

export interface PdfStat {
  label: string;
  value: string | number;
}

export function renderStatGrid(stats: PdfStat[]): string {
  return `
    <section class="pdf-section pdf-stat-grid">
      ${stats
        .map(
          (s) => `
        <div class="pdf-stat-card">
          <p class="pdf-stat-card__label">${escapeHtml(s.label)}</p>
          <p class="pdf-stat-card__value">${escapeHtml(String(s.value))}</p>
        </div>`,
        )
        .join('')}
    </section>
  `;
}

const SEVERITY_LABEL: Record<AlertSeverity, string> = { critical: 'Critical', warn: 'Warning', info: 'Info' };
const SEVERITY_VARIANT: Record<AlertSeverity, string> = { critical: 'danger', warn: 'warning', info: 'accent' };

export function badge(severity: AlertSeverity): string {
  return `<span class="pdf-badge pdf-badge--${SEVERITY_VARIANT[severity]}">${SEVERITY_LABEL[severity]}</span>`;
}

export interface PdfAlert {
  content: string;
  severity: AlertSeverity;
  missionName?: string;
}

export function renderAlertList(title: string, alerts: PdfAlert[]): string {
  if (alerts.length === 0) return '';
  return `
    <section class="pdf-section">
      <div class="pdf-card">
        <h3 class="pdf-card__header">${escapeHtml(title)}</h3>
        <ul class="pdf-alert-list">
          ${alerts
            .map(
              (a) => `
            <li>
              ${badge(a.severity)}
              <span>${escapeHtml(a.content)}</span>
              ${a.missionName ? `<span class="pdf-alert-mission">— ${escapeHtml(a.missionName)}</span>` : ''}
            </li>`,
            )
            .join('')}
        </ul>
      </div>
    </section>
  `;
}

export interface PdfTableColumn<Row> {
  label: string;
  align?: 'right';
  render: (row: Row) => string;
}

export function renderTable<Row>(header: string, columns: PdfTableColumn<Row>[], rows: Row[]): string {
  return `
    <section class="pdf-section">
      <div class="pdf-card">
        <h3 class="pdf-card__header">${escapeHtml(header)}</h3>
        <table class="pdf-table">
          <thead>
            <tr>
              ${columns.map((c) => `<th class="${c.align === 'right' ? 'pdf-table--right' : ''}">${escapeHtml(c.label)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
              <tr>
                ${columns.map((c) => `<td class="${c.align === 'right' ? 'pdf-table--right' : ''}">${c.render(row)}</td>`).join('')}
              </tr>`,
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

export function renderBarRow(label: string, value: number, max: number): string {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return `
    <div class="pdf-bar-row">
      <span class="pdf-bar-row__label">${escapeHtml(label)}</span>
      <span class="pdf-bar-row__track"><span class="pdf-bar-row__fill" style="width:${pct}%"></span></span>
      <span class="pdf-bar-row__value">${value}</span>
    </div>
  `;
}
