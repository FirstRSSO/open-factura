import PDFDocument from "pdfkit";
import { NormalizedRideData, RidePdfOptions } from "../types";
import { generateBarcodeBuffer } from "../barcode";

export async function renderStandardTemplate(
  doc: PDFKit.PDFDocument,
  data: NormalizedRideData,
  options: RidePdfOptions
): Promise<void> {
  const margin = 28;
  const pageWidth = doc.page.width;
  const usableWidth = pageWidth - margin * 2;
  const primaryColor = options.primaryColor || "#1E3A8A"; // Azul corporativo elegante por defecto

  let currentY = 28;

  // ==========================================
  // 1. ENCABEZADO MODERNO CON BANNER DE COLOR
  // ==========================================
  const headerHeight = 75;
  doc.rect(margin, currentY, usableWidth, headerHeight).fill(primaryColor);

  // Logo si existe
  let logoOffset = 0;
  if (options.logo) {
    try {
      doc.image(options.logo, margin + 12, currentY + 12, {
        fit: [100, headerHeight - 24],
        valign: "center",
      });
      logoOffset = 115;
    } catch {
      logoOffset = 0;
    }
  }

  // Título e Identificación en Banner
  doc.fillColor("#FFFFFF");
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .text(data.emisor.nombreComercial || data.emisor.razonSocial, margin + 14 + logoOffset, currentY + 16, {
      width: usableWidth - logoOffset - 170,
    });

  doc
    .font("Helvetica")
    .fontSize(8.5)
    .text(`RUC: ${data.emisor.ruc}`, margin + 14 + logoOffset, currentY + 40);
  doc.text(`Razón Social: ${data.emisor.razonSocial}`, margin + 14 + logoOffset, currentY + 52);

  // Comprobante y Número en la esquina derecha del banner
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(data.tipoComprobante, margin + usableWidth - 170, currentY + 18, {
      width: 155,
      align: "right",
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .text(`No. ${data.numeroComprobante}`, margin + usableWidth - 170, currentY + 36, {
      width: 155,
      align: "right",
    });

  currentY += headerHeight + 14;

  // ==========================================
  // 2. BLOQUE AUTORIZACIÓN + CLAVE DE ACCESO
  // ==========================================
  const authBoxHeight = 55;
  doc
    .rect(margin, currentY, usableWidth, authBoxHeight)
    .fillAndStroke("#F8FAFC", "#E2E8F0");

  doc.fillColor("#0F172A");
  doc.font("Helvetica-Bold").fontSize(7.5).text("NÚMERO DE AUTORIZACIÓN SRI:", margin + 10, currentY + 8);
  doc.font("Helvetica").fontSize(7.5).text(data.numeroAutorizacion, margin + 160, currentY + 8);

  doc.font("Helvetica-Bold").fontSize(7.5).text("FECHA Y HORA:", margin + 10, currentY + 20);
  doc.font("Helvetica").fontSize(7.5).text(data.fechaAutorizacion, margin + 85, currentY + 20);

  doc.font("Helvetica-Bold").fontSize(7.5).text("AMBIENTE:", margin + 250, currentY + 20);
  doc.font("Helvetica").fontSize(7.5).text(data.ambiente, margin + 305, currentY + 20);

  doc.font("Helvetica-Bold").fontSize(7.5).text("EMISIÓN:", margin + 410, currentY + 20);
  doc.font("Helvetica").fontSize(7.5).text(data.tipoEmision, margin + 455, currentY + 20);

  // Clave de acceso
  doc.font("Helvetica-Bold").fontSize(7.5).text("CLAVE DE ACCESO:", margin + 10, currentY + 35);
  doc.font("Helvetica").fontSize(7.5).text(data.claveAcceso, margin + 105, currentY + 35);

  currentY += authBoxHeight + 10;

  // ==========================================
  // 3. DATOS DEL CLIENTE / RECEPTOR
  // ==========================================
  const clientBoxH = 46;
  doc
    .rect(margin, currentY, usableWidth, clientBoxH)
    .fillAndStroke("#FFFFFF", "#E2E8F0");

  doc.fillColor("#334155");
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .text("Razón Social:", margin + 10, currentY + 8, { continued: true })
    .font("Helvetica")
    .text(` ${data.comprador.razonSocial}`);

  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .text("Identificación:", margin + 10, currentY + 22, { continued: true })
    .font("Helvetica")
    .text(` ${data.comprador.identificacion}`);

  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .text("Fecha Emisión:", margin + 300, currentY + 22, { continued: true })
    .font("Helvetica")
    .text(` ${data.comprador.fechaEmision}`);

  if (data.comprador.direccion) {
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .text("Dirección:", margin + 10, currentY + 34, { continued: true })
      .font("Helvetica")
      .text(` ${data.comprador.direccion}`);
  }

  currentY += clientBoxH + 12;

  // ==========================================
  // 4. TABLA DE ÍTEMS
  // ==========================================
  const tableHeaderY = currentY;
  const tHeaderH = 22;

  doc.rect(margin, tableHeaderY, usableWidth, tHeaderH).fill(primaryColor);

  const colCod = margin + 8;
  const colCant = margin + 80;
  const colDesc = margin + 130;
  const colUnit = margin + 350;
  const colDescI = margin + 415;
  const colTotal = margin + 475;

  const wTotal = usableWidth - (colTotal - margin);

  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(7.5);
  doc.text("Código", colCod, tableHeaderY + 7);
  doc.text("Cant.", colCant, tableHeaderY + 7, { width: 40, align: "center" });
  doc.text("Descripción", colDesc, tableHeaderY + 7);
  doc.text("P. Unitario", colUnit, tableHeaderY + 7, { width: 55, align: "right" });
  doc.text("Descuento", colDescI, tableHeaderY + 7, { width: 50, align: "right" });
  doc.text("Total", colTotal, tableHeaderY + 7, { width: wTotal - 8, align: "right" });

  let rowY = tableHeaderY + tHeaderH;
  data.items.forEach((item, idx) => {
    const isEven = idx % 2 === 0;
    const descH = doc.heightOfString(item.description, { width: 210 });
    const rowH = Math.max(descH + 8, 18);

    if (rowY + rowH > doc.page.height - 180) {
      doc.addPage();
      rowY = 30;
    }

    doc
      .rect(margin, rowY, usableWidth, rowH)
      .fillAndStroke(isEven ? "#F8FAFC" : "#FFFFFF", "#E2E8F0");

    doc.fillColor("#0F172A").font("Helvetica").fontSize(7.5);
    doc.text(item.code, colCod, rowY + 5);
    doc.text(String(item.quantity), colCant, rowY + 5, { width: 40, align: "center" });
    doc.text(item.description, colDesc, rowY + 5, { width: 210 });
    doc.text(Number(item.unitPrice).toFixed(2), colUnit, rowY + 5, { width: 55, align: "right" });
    doc.text(Number(item.discount).toFixed(2), colDescI, rowY + 5, { width: 50, align: "right" });
    doc.font("Helvetica-Bold").text(Number(item.total).toFixed(2), colTotal, rowY + 5, {
      width: wTotal - 8,
      align: "right",
    });

    rowY += rowH;
  });

  currentY = rowY + 12;

  // ==========================================
  // 5. SECCIÓN INFERIOR: BARCODE, PAGOS Y TOTALES
  // ==========================================
  if (currentY > doc.page.height - 190) {
    doc.addPage();
    currentY = 30;
  }

  const colWidth = (usableWidth - 14) / 2;
  const leftColX = margin;
  const rightColX = margin + colWidth + 14;

  // Código de barras a la izquierda
  let leftY = currentY;
  try {
    const barcodeBuffer = await generateBarcodeBuffer(data.claveAcceso);
    doc.image(barcodeBuffer, leftColX + 5, leftY, {
      width: colWidth - 10,
      height: 28,
    });
    leftY += 32;
    doc.font("Helvetica").fontSize(6.5).fillColor("#64748B").text(data.claveAcceso, leftColX, leftY, {
      width: colWidth,
      align: "center",
    });
    leftY += 12;
  } catch {
    leftY += 10;
  }

  // Info Adicional en la columna izquierda
  if (data.infoAdicional.length > 0) {
    doc
      .rect(leftColX, leftY, colWidth, 18)
      .fillAndStroke(primaryColor, primaryColor);
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(7.5).text("Información Adicional", leftColX + 8, leftY + 5);

    let adicY = leftY + 22;
    data.infoAdicional.forEach((info) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(7)
        .fillColor("#334155")
        .text(`${info.nombre}: `, leftColX + 4, adicY, { continued: true })
        .font("Helvetica")
        .text(info.valor);
      adicY += 12;
    });
  }

  // Totales en la columna derecha
  const totalRows: Array<{ label: string; value: string; isBold?: boolean }> = [
    { label: "Subtotal Sin Impuestos", value: data.totales.subtotalSinImpuestos },
  ];

  data.totales.impuestos.forEach((tax) => {
    totalRows.push({
      label: tax.label || `Subtotal ${tax.tarifa || ""}%`,
      value: tax.baseImponible,
    });
  });

  totalRows.push({ label: "Total Descuento", value: data.totales.totalDescuento });

  data.totales.impuestos.forEach((tax) => {
    if (Number(tax.valor) > 0) {
      totalRows.push({
        label: `IVA ${tax.tarifa || ""}%`,
        value: tax.valor,
      });
    }
  });

  if (Number(data.totales.propina) > 0) {
    totalRows.push({ label: "Propina", value: data.totales.propina });
  }

  totalRows.push({
    label: "VALOR TOTAL",
    value: data.totales.importeTotal,
    isBold: true,
  });

  const rowH = 17;
  let totalsY = currentY;
  totalRows.forEach((r, idx) => {
    const isFinal = r.isBold;
    doc
      .rect(rightColX, totalsY + idx * rowH, colWidth, rowH)
      .fillAndStroke(isFinal ? primaryColor : idx % 2 === 0 ? "#F8FAFC" : "#FFFFFF", "#E2E8F0");

    doc
      .font(isFinal ? "Helvetica-Bold" : "Helvetica")
      .fontSize(isFinal ? 8.5 : 7.5)
      .fillColor(isFinal ? "#FFFFFF" : "#0F172A")
      .text(r.label, rightColX + 8, totalsY + idx * rowH + 4, { width: colWidth * 0.65 });

    doc
      .font("Helvetica-Bold")
      .fontSize(isFinal ? 8.5 : 7.5)
      .fillColor(isFinal ? "#FFFFFF" : "#0F172A")
      .text(`$${Number(r.value).toFixed(2)}`, rightColX + colWidth * 0.65, totalsY + idx * rowH + 4, {
        width: colWidth * 0.35 - 8,
        align: "right",
      });
  });
}
