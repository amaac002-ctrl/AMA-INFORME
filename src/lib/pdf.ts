import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

type CanvasOptions = NonNullable<Parameters<typeof html2canvas>[1]> & { delayMs?: number };

/**
 * Resolve the `.pdf-content` element inside a ref container used across the app
 * for report rendering. Throws when it is not present.
 */
export function getPdfContentElement(container: HTMLElement | null | undefined): HTMLElement {
  const element = container?.querySelector('.pdf-content') as HTMLElement | null;
  if (!element) throw new Error('Content element not found');
  return element;
}

/**
 * Render an element to a canvas with the shared html2canvas configuration.
 * `delayMs` waits before capture so images/fonts settle.
 */
export async function renderElementToCanvas(
  element: HTMLElement,
  { delayMs = 500, ...options }: CanvasOptions = {}
): Promise<HTMLCanvasElement> {
  await new Promise(resolve => setTimeout(resolve, delayMs));
  return html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    ...options,
  });
}

/**
 * Render an element to an A4 PDF and trigger a download with the given filename.
 */
export async function downloadPdfFromElement(
  element: HTMLElement,
  filename: string,
  options?: CanvasOptions
): Promise<void> {
  const canvas = await renderElementToCanvas(element, options);
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  pdf.save(filename);
}
