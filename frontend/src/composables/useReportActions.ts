import { ref } from 'vue';
import { useToast } from './useToast';

/** Print/export and link-sharing behavior shared by every premium report page. Export downloads
 * a server-rendered, TNP-branded PDF (see src/pdf/templates on the backend) rather than relying
 * on the browser's own print pipeline, which produced flat, unbranded output. */
export function useReportActions() {
  const toast = useToast();
  const exportingPdf = ref(false);

  async function exportPdf(url: string): Promise<void> {
    exportingPdf.value = true;
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error(`Export failed with status ${res.status}`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = /filename="([^"]+)"/.exec(disposition);
      link.download = match?.[1] ?? 'pulse-report.pdf';
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error('Could not export the PDF.');
    } finally {
      exportingPdf.value = false;
    }
  }

  async function copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard.');
    } catch {
      toast.error('Could not copy the link.');
    }
  }

  return { exportPdf, exportingPdf, copyLink };
}
