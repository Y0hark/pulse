/**
 * Print-safe TNP theme for server-rendered PDF exports.
 * Mirrors the light-surface variant of frontend/src/styles/tokens.css (not shared at build
 * time — backend and frontend don't share a bundle) so exported PDFs match the on-screen
 * premium reports instead of the flat white browser-print output they replace.
 */
export const PDF_THEME_CSS = `
  @page {
    size: A4;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    background: #f4f6f9;
    color: #171b22;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    font-size: 10.5px;
    line-height: 1.5;
  }

  .pdf-page {
    padding: 20px 28px 28px;
  }

  .pdf-eyebrow {
    display: inline-block;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #0f9d8e;
    margin: 0 0 4px;
  }

  .pdf-title {
    margin: 0 0 4px;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: #12151b;
  }

  .pdf-subtitle {
    margin: 0 0 2px;
    font-size: 11px;
    color: #4b5567;
  }

  .pdf-meta {
    margin: 10px 0 0;
    font-size: 9px;
    color: #8892a3;
    display: flex;
    gap: 16px;
  }

  .pdf-accent-bar {
    height: 4px;
    border-radius: 999px;
    background: linear-gradient(90deg, #2dd4bf, #14b8a6);
    margin: 14px 0 18px;
  }

  .pdf-section {
    margin-bottom: 16px;
    break-inside: avoid;
  }

  .pdf-section__title {
    font-size: 12px;
    font-weight: 700;
    margin: 0 0 8px;
    color: #12151b;
  }

  .pdf-summary {
    background: rgba(45, 212, 191, 0.1);
    border: 1px solid rgba(45, 212, 191, 0.35);
    border-radius: 10px;
    padding: 12px 16px;
    break-inside: avoid;
  }

  .pdf-summary ul {
    margin: 0;
    padding-left: 16px;
  }

  .pdf-summary li {
    margin-bottom: 4px;
  }

  .pdf-summary li:last-child {
    margin-bottom: 0;
  }

  .pdf-summary__empty {
    margin: 0;
    color: #4b5567;
  }

  .pdf-stat-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .pdf-stat-card {
    flex: 1 1 120px;
    background: #ffffff;
    border: 1px solid #dbe0e8;
    border-radius: 10px;
    padding: 10px 12px;
    break-inside: avoid;
  }

  .pdf-stat-card__label {
    font-size: 8.5px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #8892a3;
    margin: 0 0 4px;
  }

  .pdf-stat-card__value {
    font-size: 18px;
    font-weight: 700;
    color: #12151b;
  }

  .pdf-card {
    background: #ffffff;
    border: 1px solid #dbe0e8;
    border-radius: 10px;
    padding: 14px 16px;
  }

  .pdf-card__header {
    font-size: 11px;
    font-weight: 700;
    margin: 0 0 10px;
    color: #12151b;
    border-bottom: 1px solid #eef1f6;
    padding-bottom: 8px;
  }

  table.pdf-table {
    width: 100%;
    border-collapse: collapse;
  }

  table.pdf-table th {
    text-align: left;
    font-size: 8.5px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #8892a3;
    padding: 6px 8px;
    border-bottom: 1px solid #dbe0e8;
  }

  table.pdf-table th.pdf-table--right,
  table.pdf-table td.pdf-table--right {
    text-align: right;
  }

  table.pdf-table td {
    font-size: 10px;
    padding: 6px 8px;
    border-bottom: 1px solid #eef1f6;
    color: #171b22;
  }

  table.pdf-table tr {
    break-inside: avoid;
  }

  .pdf-badge {
    display: inline-block;
    font-size: 8.5px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 999px;
  }

  .pdf-badge--success {
    background: rgba(34, 197, 94, 0.14);
    color: #15803d;
  }

  .pdf-badge--warning {
    background: rgba(245, 158, 11, 0.14);
    color: #b45309;
  }

  .pdf-badge--danger {
    background: rgba(240, 85, 74, 0.14);
    color: #b91c1c;
  }

  .pdf-badge--accent {
    background: rgba(45, 212, 191, 0.14);
    color: #0f766e;
  }

  .pdf-alert-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .pdf-alert-list li {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 5px 0;
    border-bottom: 1px solid #eef1f6;
  }

  .pdf-alert-list li:last-child {
    border-bottom: none;
  }

  .pdf-alert-mission {
    color: #8892a3;
    font-size: 9px;
  }

  .pdf-bar-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }

  .pdf-bar-row:last-child {
    margin-bottom: 0;
  }

  .pdf-bar-row__label {
    flex: 0 0 70px;
    font-size: 9px;
    color: #4b5567;
  }

  .pdf-bar-row__track {
    flex: 1;
    height: 8px;
    background: #eef1f6;
    border-radius: 999px;
    overflow: hidden;
  }

  .pdf-bar-row__fill {
    height: 100%;
    background: linear-gradient(90deg, #2dd4bf, #14b8a6);
    border-radius: 999px;
  }

  .pdf-bar-row__value {
    flex: 0 0 32px;
    text-align: right;
    font-size: 9px;
    font-weight: 600;
    color: #12151b;
  }
`;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface PdfDocumentOptions {
  title: string;
  bodyHtml: string;
}

/** Wraps a template's body HTML in the full document shell (theme + <html>/<body>). */
export function renderPdfDocument({ title, bodyHtml }: PdfDocumentOptions): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>${PDF_THEME_CSS}</style>
</head>
<body>
<div class="pdf-page">${bodyHtml}</div>
</body>
</html>`;
}

export const PDF_HEADER_TEMPLATE = `
  <div style="font-size:8px; color:#8892a3; width:100%; padding:6px 28px 0; display:flex; justify-content:space-between; -webkit-print-color-adjust:exact;">
    <span style="font-weight:700; color:#0f9d8e;">PULSE</span>
    <span class="title"></span>
  </div>
`;

export const PDF_FOOTER_TEMPLATE = `
  <div style="font-size:8px; color:#8892a3; width:100%; padding:0 28px 8px; display:flex; justify-content:space-between; -webkit-print-color-adjust:exact;">
    <span>Confidential — internal use only</span>
    <span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>
  </div>
`;
