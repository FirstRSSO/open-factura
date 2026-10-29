/**
 * Índice absoluto de la hoja en curso (0 = primera). Vale con o sin
 * `bufferPages`: sin búfer, pdfkit avanza `start` al soltar cada hoja.
 */
export function currentPageIndex(doc: PDFKit.PDFDocument): number {
  const { start, count } = doc.bufferedPageRange();
  return start + count - 1;
}
