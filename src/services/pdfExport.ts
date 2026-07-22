import type { Browser } from 'puppeteer';
import { PDF_FOOTER_TEMPLATE, PDF_HEADER_TEMPLATE } from '../pdf/theme.js';

let browserPromise: Promise<Browser> | null = null;

/** Puppeteer's own startup cost (~1-2s) makes a per-request launch too slow for interactive
 * export clicks, so the browser is launched once lazily and reused for every PDF render. */
function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = import('puppeteer').then(({ default: puppeteer }) =>
      puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }),
    );
  }
  return browserPromise;
}

export async function renderPdf(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'load' });
    const buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: PDF_HEADER_TEMPLATE,
      footerTemplate: PDF_FOOTER_TEMPLATE,
      margin: { top: '40px', bottom: '36px', left: '0px', right: '0px' },
    });
    return Buffer.from(buffer);
  } finally {
    await page.close();
  }
}

export async function closePdfBrowser(): Promise<void> {
  if (!browserPromise) return;
  const browser = await browserPromise;
  await browser.close();
  browserPromise = null;
}
