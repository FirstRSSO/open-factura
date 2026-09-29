import PDFDocument from "pdfkit";
import { NormalizedRideData, RidePdfOptions } from "../types";
import { generateBarcodeBuffer } from "../barcode";

function roundedRect(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 6
) {
  doc.moveTo(x + radius, y);
  doc.lineTo(x + width - radius, y);
  doc.quadraticCurveTo(x + width, y, x + width, y + radius);
  doc.lineTo(x + width, y + height - radius);
  doc.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  doc.lineTo(x + radius, y + height);
  doc.quadraticCurveTo(x, y + height, x, y + height - radius);
  doc.lineTo(x, y + radius);
  doc.quadraticCurveTo(x, y, x + radius, y);
  doc.stroke();
}

export async function renderFullmegasTemplate(
  doc: PDFKit.PDFDocument,
  data: NormalizedRideData,
  options: RidePdfOptions
): Promise<void> {
  const margin = 20;
  const pageWidth = doc.page.width;
  const usableWidth = pageWidth - margin * 2;
  const gap = 10;
  const halfWidth = (usableWidth - gap) / 2;

  let currentY = 20;

  // ==========================================
  // 1. ENCABEZADO: 2 COLUMNAS (Estilo Fullmegas)
  // ==========================================
  const leftX = margin;
  const rightX = margin + halfWidth + gap;

  // Columna Izquierda: Logo (si existe) y Datos del Emisor
  let boxLogoHeight = 70;
  if (options.logo) {
    try {
      doc.image(options.logo, leftX + 10, currentY + 5, {
        fit: [halfWidth - 20, boxLogoHeight - 10],
        align: "center",
        valign: "center",
      });
    } catch {
      // Si falla la imagen, continuamos sin bloquear
    }
  } else {
    boxLogoHeight = 10;
  }

  const emisorY = currentY + boxLogoHeight + 5;
  const emisorLines: Array<{ label?: string; text?: string; bold?: boolean }> = [
    { text: data.emisor.nombreComercial || data.emisor.razonSocial, bold: true },
    { text: data.emisor.razonSocial },
    { label: "DIRECCIÓN MATRIZ", text: data.emisor.dirMatriz },
  ];

  if (data.emisor.dirEstablecimiento) {
    emisorLines.push({
      label: "DIRECCIÓN SUCURSAL",
      text: data.emisor.dirEstablecimiento,
    });
  }

  emisorLines.push({
    label: "OBLIGADO A LLEVAR CONTABILIDAD",
    text: data.emisor.obligadoContabilidad,
  });

  if (data.emisor.contribuyenteEspecial) {
    emisorLines.push({
      label: "CONTRIBUYENTE ESPECIAL No.",
      text: data.emisor.contribuyenteEspecial,
    });
  }

  if (data.emisor.contribuyenteRimpe) {
    emisorLines.push({
      text: data.emisor.contribuyenteRimpe,
      bold: true,
    });
  }

  if (data.emisor.agenteRetencion) {
    emisorLines.push({
      label: "AGENTE DE RETENCIÓN Resol. No.",
      text: data.emisor.agenteRetencion,
    });
  }

  // Medir altura de la caja de emisor
  doc.fontSize(8).font("Helvetica");
  let emisorContentHeight = 10;
  emisorLines.forEach((line) => {
    const txt = line.label ? `${line.label}: ${line.text || "-"}` : line.text || "-";
    emisorContentHeight += doc.heightOfString(txt, { width: halfWidth - 20 }) + 3;
  });

  const emisorBoxHeight = Math.max(emisorContentHeight + 10, 110);
  roundedRect(doc, leftX, emisorY, halfWidth, emisorBoxHeight, 8);

  // Renderizar líneas del emisor
  let textY = emisorY + 8;
  emisorLines.forEach((line) => {
    doc.font(line.bold ? "Helvetica-Bold" : "Helvetica").fontSize(8);
    const txt = line.label ? `${line.label}: ${line.text || "-"}` : line.text || "-";
    doc.text(txt, leftX + 10, textY, { width: halfWidth - 20 });
    textY += doc.heightOfString(txt, { width: halfWidth - 20 }) + 3;
  });

  // Columna Derecha: Datos Factura, Autorización y Código de Barras
  const facturaLines = [
    `RUC: ${data.emisor.ruc}`,
    `${data.tipoComprobante}`,
    `No. ${data.numeroComprobante}`,
    `NÚMERO DE AUTORIZACIÓN:`,
    `${data.numeroAutorizacion}`,
    `FECHA Y HORA DE AUTORIZACIÓN: ${data.fechaAutorizacion}`,
    `AMBIENTE: ${data.ambiente}`,
    `EMISIÓN: ${data.tipoEmision}`,
    `CLAVE DE ACCESO:`,
  ];

  doc.fontSize(8).font("Helvetica");
  let rightContentHeight = 15;
  facturaLines.forEach((line) => {
    rightContentHeight += doc.heightOfString(line, { width: halfWidth - 20 }) + 2;
  });

  const barcodeHeight = 35;
  const totalRightBoxHeight = rightContentHeight + barcodeHeight + 25;
  roundedRect(doc, rightX, currentY, halfWidth, totalRightBoxHeight, 8);

  let rightTextY = currentY + 10;
  facturaLines.forEach((line, idx) => {
    const isBold = [0, 1, 2, 3, 8].includes(idx);
    doc.font(isBold ? "Helvetica-Bold" : "Helvetica").fontSize(idx === 1 ? 9 : 8);
    doc.text(line, rightX + 10, rightTextY, { width: halfWidth - 20 });
    rightTextY += doc.heightOfString(line, { width: halfWidth - 20 }) + 2;
  });

  // Dibujar Código de Barras (bwip-js)
  try {
    const barcodeBuffer = await generateBarcodeBuffer(data.claveAcceso);
    doc.image(barcodeBuffer, rightX + 10, rightTextY + 2, {
      width: halfWidth - 20,
      height: 25,
    });
    rightTextY += 28;
    doc.font("Helvetica").fontSize(7).text(data.claveAcceso, rightX + 10, rightTextY, {
      width: halfWidth - 20,
      align: "center",
    });
  } catch {
    doc.font("Helvetica").fontSize(7).text(data.claveAcceso, rightX + 10, rightTextY, {
      width: halfWidth - 20,
      align: "center",
    });
  }

  currentY = Math.max(emisorY + emisorBoxHeight, currentY + totalRightBoxHeight) + 10;

  // ==========================================
  // 2. DATOS DEL CLIENTE / COMPRADOR (Caja Completa)
  // ==========================================
  const clientBoxY = currentY;
  const clientLines = [
    { label: "Razón Social / Nombres y Apellidos", value: data.comprador.razonSocial },
    { label: "Identificación", value: data.comprador.identificacion },
    { label: "Fecha de Emisión", value: data.comprador.fechaEmision },
    ...(data.comprador.direccion
      ? [{ label: "Dirección", value: data.comprador.direccion }]
      : []),
    ...(data.comprador.guiaRemision
      ? [{ label: "Guía de Remisión", value: data.comprador.guiaRemision }]
      : []),
  ];

  doc.fontSize(8);
  let clientBoxHeight = 15;
  clientLines.forEach((c) => {
    clientBoxHeight += doc.heightOfString(`${c.label}: ${c.value}`, { width: usableWidth - 20 }) + 3;
  });
  clientBoxHeight = Math.max(clientBoxHeight, 45);

  roundedRect(doc, margin, clientBoxY, usableWidth, clientBoxHeight, 6);

  let cY = clientBoxY + 8;
  clientLines.forEach((c) => {
    doc
      .font("Helvetica-Bold")
      .text(`${c.label}: `, margin + 10, cY, { continued: true })
      .font("Helvetica")
      .text(c.value);
    cY += 12;
  });

  currentY = clientBoxY + clientBoxHeight + 12;

  // ==========================================
  // 3. TABLA DE PRODUCTOS / SERVICIOS
  // ==========================================
  const colCod = margin + 5;
  const colCant = margin + 70;
  const colDesc = margin + 115;
  const colUnit = margin + 340;
  const colDescItem = margin + 415;
  const colTotal = margin + 480;

  const widthCod = 60;
  const widthCant = 40;
  const widthDesc = 220;
  const widthUnit = 70;
  const widthDescItem = 60;
  const widthTotal = usableWidth - (colTotal - margin);

  // Header de la tabla
  const tableHeaderY = currentY;
  const headerHeight = 20;

  doc.rect(margin, tableHeaderY, usableWidth, headerHeight).fillAndStroke("#F3F4F6", "#000");

  doc.fillColor("#000").font("Helvetica-Bold").fontSize(7.5);
  doc.text("Cod. Principal", colCod, tableHeaderY + 6, { width: widthCod });
  doc.text("Cantidad", colCant, tableHeaderY + 6, { width: widthCant, align: "center" });
  doc.text("Descripción", colDesc, tableHeaderY + 6, { width: widthDesc });
  doc.text("Precio Unit.", colUnit, tableHeaderY + 6, { width: widthUnit, align: "right" });
  doc.text("Descuento", colDescItem, tableHeaderY + 6, { width: widthDescItem, align: "right" });
  doc.text("Precio Total", colTotal, tableHeaderY + 6, { width: widthTotal, align: "right" });

  let rowY = tableHeaderY + headerHeight;
  doc.font("Helvetica").fontSize(7.5);

  data.items.forEach((item, idx) => {
    // Calcular altura de la fila según la descripción
    const descHeight = doc.heightOfString(item.description, { width: widthDesc });
    const rowHeight = Math.max(descHeight + 6, 16);

    // Salto de página si se pasa del límite
    if (rowY + rowHeight > doc.page.height - 180) {
      doc.addPage();
      rowY = 30;
    }

    doc.rect(margin, rowY, usableWidth, rowHeight).stroke();

    doc.text(item.code, colCod, rowY + 4, { width: widthCod });
    doc.text(String(item.quantity), colCant, rowY + 4, { width: widthCant, align: "center" });
    doc.text(item.description, colDesc, rowY + 4, { width: widthDesc });
    doc.text(Number(item.unitPrice).toFixed(2), colUnit, rowY + 4, { width: widthUnit, align: "right" });
    doc.text(Number(item.discount).toFixed(2), colDescItem, rowY + 4, { width: widthDescItem, align: "right" });
    doc.text(Number(item.total).toFixed(2), colTotal, rowY + 4, { width: widthTotal, align: "right" });

    rowY += rowHeight;
  });

  currentY = rowY + 12;

  // ==========================================
  // 4. PIE DE FACTURA: INFO ADICIONAL + TOTALES
  // ==========================================
  if (currentY > doc.page.height - 180) {
    doc.addPage();
    currentY = 30;
  }

  const bottomHalfWidth = (usableWidth - gap) / 2;
  const bLeftX = margin;
  const bRightX = margin + bottomHalfWidth + gap;

  // Lado Izquierdo: Info Adicional y Formas de Pago
  let leftY = currentY;

  // Caja Información Adicional
  if (data.infoAdicional.length > 0) {
    const adicHeaderHeight = 16;
    doc.rect(bLeftX, leftY, bottomHalfWidth, adicHeaderHeight).fillAndStroke("#F3F4F6", "#000");
    doc.fillColor("#000").font("Helvetica-Bold").fontSize(7.5).text("Información Adicional", bLeftX + 8, leftY + 5);

    let adicContentY = leftY + adicHeaderHeight + 6;
    let adicBoxHeight = adicHeaderHeight + 8;

    data.infoAdicional.forEach((info) => {
      const lineText = `${info.nombre}: ${info.valor}`;
      const h = doc.heightOfString(lineText, { width: bottomHalfWidth - 16 });
      adicBoxHeight += h + 3;
    });

    roundedRect(doc, bLeftX, leftY, bottomHalfWidth, adicBoxHeight, 4);

    data.infoAdicional.forEach((info) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(7)
        .text(`${info.nombre}: `, bLeftX + 8, adicContentY, { continued: true, width: bottomHalfWidth - 16 })
        .font("Helvetica")
        .text(info.valor);
      adicContentY += doc.heightOfString(`${info.nombre}: ${info.valor}`, { width: bottomHalfWidth - 16 }) + 3;
    });

    leftY += adicBoxHeight + 8;
  }

  // Caja Formas de Pago
  if (data.pagos.length > 0) {
    const pagoHeaderHeight = 16;
    doc.rect(bLeftX, leftY, bottomHalfWidth, pagoHeaderHeight).fillAndStroke("#F3F4F6", "#000");
    doc.fillColor("#000").font("Helvetica-Bold").fontSize(7.5).text("Forma de Pago", bLeftX + 8, leftY + 5);

    let pagoContentY = leftY + pagoHeaderHeight + 4;
    const pagoBoxHeight = pagoHeaderHeight + data.pagos.length * 16 + 8;
    roundedRect(doc, bLeftX, leftY, bottomHalfWidth, pagoBoxHeight, 4);

    data.pagos.forEach((p) => {
      doc.font("Helvetica").fontSize(7);
      doc.text(p.formaPago, bLeftX + 8, pagoContentY, { width: bottomHalfWidth * 0.7 });
      doc.font("Helvetica-Bold").text(`$${Number(p.total).toFixed(2)}`, bLeftX + bottomHalfWidth * 0.7, pagoContentY, {
        width: bottomHalfWidth * 0.3 - 8,
        align: "right",
      });
      pagoContentY += 14;
    });
  }

  // Lado Derecho: Totales de la Factura
  const totalRows: Array<{ label: string; value: string; isFinal?: boolean }> = [
    { label: "SUBTOTAL SIN IMPUESTOS", value: data.totales.subtotalSinImpuestos },
  ];

  data.totales.impuestos.forEach((tax) => {
    totalRows.push({
      label: tax.label || `SUBTOTAL ${tax.tarifa || ""}%`,
      value: tax.baseImponible,
    });
  });

  totalRows.push({ label: "TOTAL DESCUENTO", value: data.totales.totalDescuento });

  // Sumar valores de IVA
  data.totales.impuestos.forEach((tax) => {
    if (Number(tax.valor) > 0) {
      totalRows.push({
        label: `IVA ${tax.tarifa || ""}%`,
        value: tax.valor,
      });
    }
  });

  if (Number(data.totales.propina) > 0) {
    totalRows.push({ label: "PROPINA", value: data.totales.propina });
  }

  totalRows.push({
    label: "VALOR TOTAL",
    value: data.totales.importeTotal,
    isFinal: true,
  });

  let totalsY = currentY;
  const rowHeightT = 16;
  const totalBoxHeightT = totalRows.length * rowHeightT;

  roundedRect(doc, bRightX, totalsY, bottomHalfWidth, totalBoxHeightT, 4);

  const labelW = bottomHalfWidth * 0.65;
  const valW = bottomHalfWidth * 0.35;

  totalRows.forEach((r, idx) => {
    const yPos = totalsY + idx * rowHeightT;
    if (idx > 0) {
      doc.moveTo(bRightX, yPos).lineTo(bRightX + bottomHalfWidth, yPos).stroke();
    }

    if (r.isFinal) {
      doc.rect(bRightX, yPos, bottomHalfWidth, rowHeightT).fillAndStroke("#F3F4F6", "#000");
    }

    doc
      .fillColor("#000")
      .font(r.isFinal ? "Helvetica-Bold" : "Helvetica")
      .fontSize(7.5)
      .text(r.label, bRightX + 6, yPos + 4, { width: labelW - 6 });

    doc
      .font("Helvetica-Bold")
      .text(`$${Number(r.value).toFixed(2)}`, bRightX + labelW, yPos + 4, {
        width: valW - 6,
        align: "right",
      });
  });
}
