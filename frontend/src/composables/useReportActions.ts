import { useToast } from './useToast';

/** Print/export and link-sharing behavior shared by every premium report page. Export stays
 * "print to PDF" (browser-native, no backend work) per the V1 scope — complex exports are
 * explicitly out of scope for this ticket. */
export function useReportActions() {
  const toast = useToast();

  function exportPdf(): void {
    window.print();
  }

  async function copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard.');
    } catch {
      toast.error('Could not copy the link.');
    }
  }

  return { exportPdf, copyLink };
}
