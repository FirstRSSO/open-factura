import PDFDocument from "pdfkit";
import { NormalizedRideData, RidePdfOptions } from "../types";
import { generateBarcodeBuffer } from "../barcode";

function roundedRect(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 10
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

function drawLabelValue(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string | undefined,
  x: number,
  y: number,
  options: { width?: number; labelSuffix?: string; lineGap?: number; fontSize?: number } = {}
) {
  const { width, labelSuffix = ":", lineGap = 0, fontSize = 8 } = options;
  doc
    .font("Helvetica-Bold")
    .fontSize(fontSize)
    .text(`${label}${labelSuffix} `, x, y, {
      width,
      continued: true,
      lineGap,
    })
    .font("Helvetica")
    .text(String(value || "-"), {
      continued: false,
      lineGap,
    });
}

function drawLabelValueColumns(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string | undefined,
  x: number,
  y: number,
  options: {
    width?: number;
    labelWidth?: number;
    labelSuffix?: string;
    lineGap?: number;
    fontSize?: number;
  } = {}
) {
  const {
    width,
    labelWidth = 88,
    labelSuffix = ":",
    lineGap = 0,
    fontSize = 8,
  } = options;
  const valueX = x + labelWidth;
  const valueWidth = Math.max((width || 0) - labelWidth, 40);

  doc
    .font("Helvetica-Bold")
    .fontSize(fontSize)
    .text(`${label}${labelSuffix}`, x, y, {
      width: labelWidth - 4,
      lineGap,
    });

  doc
    .font("Helvetica")
    .fontSize(fontSize)
    .text(String(value || "-"), valueX, y, {
      width: valueWidth,
      lineGap,
    });
}

function drawCustomTextBox(
  doc: PDFKit.PDFDocument,
  { x, y, width, title, text }: { x: number; y: number; width: number; title?: string; text?: string }
): number {
  const normalizedText = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!normalizedText) return 0;

  const padding = 10;
  const titleHeight = title ? 14 : 0;
  const contentWidth = width - padding * 2;
  const textHeight = doc.heightOfString(normalizedText, {
    width: contentWidth,
    lineGap: 2,
  });
  const height = padding * 2 + titleHeight + textHeight;

  roundedRect(doc, x, y, width, height, 6);

  if (title) {
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor("#000000")
      .text(title, x + padding, y + padding, {
        width: contentWidth,
      });
  }

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#000000")
    .text(normalizedText, x + padding, y + padding + titleHeight, {
      width: contentWidth,
      lineGap: 2,
    });

  return height;
}

/**
 * Renderiza la plantilla de comprobante en estilo Alternativo
 * (cajas redondeadas con radio 10, banner superior de acento, alturas sincronizadas,
 * datos de cliente a dos columnas, tabla sin cuadrículas internas y desglose de totales 60/40).
 */
export async function renderAlternativeTemplate(
  doc: PDFKit.PDFDocument,
  data: NormalizedRideData,
  options: RidePdfOptions
): Promise<void> {
  const pageWidth = doc.page.width;
  const margin = 20;
  const usableWidth = pageWidth - margin * 2;
  const gap = 10;
  const halfWidth = (usableWidth - gap) / 2;
  const startY = 20;

  // ==========================================
  // 1. ENCABEZADO SUPERIOR (2 COLUMNAS SINCRONIZADAS)
  // ==========================================

  // --- Columna Izquierda: Logo (si existe) + Emisor
  let boxLogoHeight = 0;
  if (options.logo) {
    boxLogoHeight = 110;
    const boxLogoWidth = halfWidth;
    const boxLogoX = margin;
    const boxLogoY = startY;
    const logoWidth = options.companyData?.logoWidth || 200;
    const logoHeight = options.companyData?.logoHeight || 50;
    const logoX = boxLogoX + (boxLogoWidth - logoWidth) / 2;
    const logoY = boxLogoY + (boxLogoHeight - logoHeight) / 2;

    try {
      doc.image(options.logo, logoX, logoY, {
        width: logoWidth,
        height: logoHeight,
      });
    } catch {
      boxLogoHeight = 0;
    }
  }

  const boxClienteY = boxLogoHeight > 0 ? startY + boxLogoHeight + 10 : startY;

  const issuerLines: Array<{ label?: string; value?: string; text?: string; bold?: boolean }> = [
    { text: data.emisor.nombreComercial || data.emisor.razonSocial, bold: true },
    { text: data.emisor.razonSocial },
    { label: "DIRECCION MATRIZ", value: data.emisor.dirMatriz },
  ];

  if (data.emisor.dirEstablecimiento) {
    issuerLines.push({
      label: "DIRECCION SUCURSAL",
      value: data.emisor.dirEstablecimiento,
    });
  }

  issuerLines.push({
    label: "OBLIGADO A LLEVAR CONTABILIDAD",
    value: data.emisor.obligadoContabilidad || "NO",
  });

  if (data.emisor.contribuyenteEspecial) {
    issuerLines.push({
      label: "CONTRIBUYENTE ESPECIAL No. Resolucion",
      value: data.emisor.contribuyenteEspecial,
    });
  }

  if (data.emisor.contribuyenteRimpe) {
    issuerLines.push({
      text: data.emisor.contribuyenteRimpe,
      bold: true,
    });
  }

  if (data.emisor.agenteRetencion) {
    issuerLines.push({
      label: "AGENTE DE RETENCION Resolucion No.",
      value: data.emisor.agenteRetencion,
    });
  }

  const issuerTextWidth = halfWidth - 20;
  const issuerFontSize = 8;
  doc.fontSize(issuerFontSize).font("Helvetica");
  let textHeightCliente = 12;

  issuerLines.forEach((line) => {
    const text = line.label ? `${line.label}: ${line.value || "-"}` : line.text || "-";
    doc.font(line.bold ? "Helvetica-Bold" : "Helvetica").fontSize(issuerFontSize);
    textHeightCliente +=
      doc.heightOfString(text, {
        width: issuerTextWidth,
        lineGap: 1,
      }) + 3;
  });

  // --- Columna Derecha: Datos Factura, Autorización y Código de Barras
  const boxDerechaX = margin + halfWidth + gap;
  const boxDerechaY = startY;

  const facturaLines = [
    `RUC: ${data.emisor.ruc || "-"}`,
    `No. ${data.numeroComprobante}`,
    `NUMERO DE AUTORIZACION`,
    `${data.numeroAutorizacion}`,
    `FECHA Y HORA DE AUTORIZACION: ${data.fechaAutorizacion}`,
    `AMBIENTE: ${data.ambiente || "-"}`,
    `EMISION: ${data.tipoEmision || "-"}`,
    `CLAVE DE ACCESO`,
  ];

  doc.fontSize(8).font("Helvetica");
  let textHeightFactura = 0;
  facturaLines.forEach((line) => {
    textHeightFactura += doc.heightOfString(line, { width: halfWidth - 20 }) + 5;
  });

  const barcodeHeight = 20;
  const barcodeMarginTop = 0;
  const facturaBoxMarginX = 10;
  const facturaBoxWidth = halfWidth - facturaBoxMarginX * 2;
  const facturaBoxHeightFixed = 30;
  const barcodeWidth = halfWidth - 20;
  const barcodeAuthorizationFontSize = 6;

  doc.font("Helvetica-Bold").fontSize(barcodeAuthorizationFontSize);
  const barcodeAuthorizationHeight = doc.heightOfString(data.claveAcceso, {
    width: barcodeWidth,
    align: "center",
    lineGap: 0,
  });
  const barcodeMarginBottom = barcodeAuthorizationHeight + 8;

  const boxFacturaHeight =
    facturaBoxHeightFixed +
    textHeightFactura +
    barcodeHeight +
    barcodeMarginTop +
    barcodeMarginBottom +
    26;

  // Sincronizar altura de ambas cajas superiores
  const issuerNaturalBottom = boxClienteY + textHeightCliente;
  const invoiceNaturalBottom = boxDerechaY + boxFacturaHeight;
  const topBlocksBottom = Math.max(issuerNaturalBottom, invoiceNaturalBottom);
  const boxClienteHeight = topBlocksBottom - boxClienteY;
  const boxDerechaHeight = topBlocksBottom - boxDerechaY;

  // Renderizar Caja Emisor (Izquierda)
  roundedRect(doc, margin, boxClienteY, halfWidth, boxClienteHeight, 10);

  let yCliente = boxClienteY + 8;
  issuerLines.forEach((line) => {
    const text = line.label ? `${line.label}: ${line.value || "-"}` : line.text || "-";
    doc.font(line.bold ? "Helvetica-Bold" : "Helvetica").fontSize(issuerFontSize).fillColor("#000000");
    if (line.label) {
      drawLabelValue(doc, line.label, line.value, margin + 10, yCliente, {
        width: issuerTextWidth,
        lineGap: 1,
      });
    } else {
      doc.text(text, margin + 10, yCliente, {
        width: issuerTextWidth,
        lineGap: 1,
      });
    }
    yCliente +=
      doc.heightOfString(text, {
        width: issuerTextWidth,
        lineGap: 1,
      }) + 3;
  });

  // Renderizar Caja Derecha (Factura)
  roundedRect(doc, boxDerechaX, boxDerechaY, halfWidth, boxDerechaHeight, 10);

  // Banner superior con tipo de comprobante
  const facturaBoxY = boxDerechaY + 10;
  const bannerColor = options.primaryColor || "#0d6efd";

  doc
    .rect(boxDerechaX + facturaBoxMarginX, facturaBoxY, facturaBoxWidth, facturaBoxHeightFixed)
    .fill(bannerColor);

  doc.fontSize(12).font("Helvetica-Bold").fillColor("#f2f2f2");
  const textFactura = data.tipoComprobante || "FACTURA";
  const textWidth = doc.widthOfString(textFactura);
  const textHeight = doc.currentLineHeight();
  const textX = boxDerechaX + facturaBoxMarginX + (facturaBoxWidth - textWidth) / 2;
  const textY = facturaBoxY + (facturaBoxHeightFixed - textHeight) / 2;
  doc.text(textFactura, textX, textY);

  // Líneas de detalle de factura debajo del banner
  doc.fontSize(8).font("Helvetica").fillColor("#000000");
  let yFactura = facturaBoxY + facturaBoxHeightFixed + 10;

  drawLabelValue(doc, "RUC", data.emisor.ruc || "-", boxDerechaX + 10, yFactura, {
    width: halfWidth - 20,
  });
  yFactura += doc.heightOfString(`RUC: ${data.emisor.ruc || "-"}`, { width: halfWidth - 20 }) + 5;

  drawLabelValue(doc, "No.", data.numeroComprobante, boxDerechaX + 10, yFactura, {
    width: halfWidth - 20,
    labelSuffix: "",
  });
  yFactura += doc.heightOfString(`No. ${data.numeroComprobante}`, { width: halfWidth - 20 }) + 5;

  doc.font("Helvetica-Bold").text("NUMERO DE AUTORIZACION", boxDerechaX + 10, yFactura, {
    width: halfWidth - 20,
  });
  yFactura += doc.heightOfString("NUMERO DE AUTORIZACION", { width: halfWidth - 20 }) + 5;

  doc.font("Helvetica").text(data.numeroAutorizacion, boxDerechaX + 10, yFactura, {
    width: halfWidth - 20,
  });
  yFactura += doc.heightOfString(data.numeroAutorizacion, { width: halfWidth - 20 }) + 5;

  drawLabelValue(doc, "FECHA Y HORA DE AUTORIZACION", data.fechaAutorizacion, boxDerechaX + 10, yFactura, {
    width: halfWidth - 20,
  });
  yFactura += doc.heightOfString(`FECHA Y HORA DE AUTORIZACION: ${data.fechaAutorizacion}`, { width: halfWidth - 20 }) + 5;

  drawLabelValue(doc, "AMBIENTE", data.ambiente || "-", boxDerechaX + 10, yFactura, {
    width: halfWidth - 20,
  });
  yFactura += doc.heightOfString(`AMBIENTE: ${data.ambiente || "-"}`, { width: halfWidth - 20 }) + 5;

  drawLabelValue(doc, "EMISION", data.tipoEmision || "-", boxDerechaX + 10, yFactura, {
    width: halfWidth - 20,
  });
  yFactura += doc.heightOfString(`EMISION: ${data.tipoEmision || "-"}`, { width: halfWidth - 20 }) + 5;

  doc.font("Helvetica-Bold").text("CLAVE DE ACCESO", boxDerechaX + 10, yFactura, {
    width: halfWidth - 20,
  });
  yFactura += doc.heightOfString("CLAVE DE ACCESO", { width: halfWidth - 20 }) + 5;

  // Código de barras (bwip-js)
  const barcodeX = boxDerechaX + 10;
  const barcodeBlockHeight = barcodeHeight + 2 + barcodeAuthorizationHeight;
  const maxBarcodeY = boxDerechaY + boxDerechaHeight - 10 - barcodeBlockHeight;
  const freeBarcodeSpace = Math.max(0, maxBarcodeY - yFactura);
  const barcodeY = yFactura + barcodeMarginTop + Math.min(freeBarcodeSpace / 2, 12);

  try {
    const barcodeBuffer = await generateBarcodeBuffer(data.claveAcceso);
    doc.image(barcodeBuffer, barcodeX, barcodeY, {
      width: barcodeWidth,
      height: barcodeHeight,
    });
  } catch {
    // Si falla el buffer de imagen continúa sin bloquear
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(barcodeAuthorizationFontSize)
    .fillColor("#000000")
    .text(data.claveAcceso, barcodeX, barcodeY + barcodeHeight + 2, {
      width: barcodeWidth,
      align: "center",
      lineGap: 0,
    });

  // ==========================================
  // 2. SEGUNDA CAJA: DATOS DEL CLIENTE / RECEPTOR (2 COLUMNAS)
  // ==========================================
  const secondBoxY = topBlocksBottom + 16;
  const customerBoxLines: Array<[string, string | undefined]> = [
    ["RAZON SOCIAL / NOMBRES Y APELLIDOS", data.comprador.razonSocial],
    ["RUC / CI", data.comprador.identificacion],
    ["FECHA DE EMISION", data.comprador.fechaEmision],
  ];

  if (options.companyData?.showDueDate) {
    customerBoxLines.push(["FECHA DE VENCIMIENTO", data.comprador.fechaEmision]);
  }

  if (data.comprador.guiaRemision || options.companyData?.showRemissionGuide) {
    customerBoxLines.push(["GUIA DE REMISION", data.comprador.guiaRemision || "-"]);
  }

  if (data.comprador.direccion) {
    customerBoxLines.push(["DIRECCION", data.comprador.direccion]);
  }

  const customerLineHeight = 13;
  const customerColumnGap = 18;
  const customerColumnWidth = (usableWidth - 20 - customerColumnGap) / 2;
  const customerRows = Math.ceil(customerBoxLines.length / 2);
  const secondBoxHeight = Math.max(42, customerRows * customerLineHeight + 16);

  roundedRect(doc, margin, secondBoxY, usableWidth, secondBoxHeight, 10);
  doc.fontSize(7.2).font("Helvetica").fillColor("#000000");

  customerBoxLines.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = margin + 10 + column * (customerColumnWidth + customerColumnGap);
    const y = secondBoxY + 8 + row * customerLineHeight;
    drawLabelValue(doc, label, value, x, y, {
      width: customerColumnWidth,
      fontSize: 7.2,
    });
  });

  // ==========================================
  // 3. TABLA DE PRODUCTOS (CAJA REDONDEADA Y LÍNEA SEPARADORA)
  // ==========================================
  let tableTop = secondBoxY + secondBoxHeight + 16;

  if (options.companyData?.headerText) {
    const headerTextHeight = drawCustomTextBox(doc, {
      x: margin,
      y: tableTop,
      width: usableWidth,
      title: "Texto superior",
      text: options.companyData.headerText,
    });
    tableTop += headerTextHeight + 15;
  }

  const headerHeight = 25;
  const rowPadding = 5;
  const paddingTop = 10;
  const paddingBottom = 5;

  const colCod = margin + 10;
  const colCant = margin + 90;
  const colNombre = margin + 140;
  const colPrecioUnit = margin + 300;
  const colDesc = margin + 390;
  const colTotal = margin + 480;

  const widthCod = colCant - colCod - 5;
  const widthNombre = colPrecioUnit - colNombre - 5;

  doc.font("Helvetica").fontSize(8);
  let dynamicTableHeight = headerHeight + paddingTop + paddingBottom;
  const rowHeights: number[] = [];

  data.items.forEach((item, i) => {
    const code = item.code || `${i + 1}`;
    const name = item.description || "-";

    const codeHeight = doc.heightOfString(code, { width: widthCod });
    const nameHeight = doc.heightOfString(name, { width: widthNombre });
    const rowHeight = Math.max(codeHeight, nameHeight) + rowPadding;

    rowHeights.push(rowHeight);
    dynamicTableHeight += rowHeight;
  });

  // Dibujar caja contenedora de la tabla con radio 10
  roundedRect(doc, margin, tableTop, usableWidth, dynamicTableHeight, 10);

  // Encabezados
  const headerY = tableTop + 10;
  doc.fontSize(9).font("Helvetica-Bold").fillColor("#000000");
  doc.text("Cod. Principal", colCod, headerY);
  doc.text("Cant", colCant, headerY);
  doc.text("Nombre", colNombre, headerY);
  doc.text("Precio Unitario", colPrecioUnit, headerY, {
    width: 70,
    align: "right",
  });
  doc.text("Descuento", colDesc, headerY, { width: 70, align: "right" });
  doc.text("Precio Total", colTotal, headerY, {
    width: 70,
    align: "right",
  });

  // Línea separadora bajo encabezados
  doc
    .moveTo(margin + 5, headerY + 15)
    .lineTo(margin + usableWidth - 5, headerY + 15)
    .stroke();

  // Filas de productos
  let rowY = headerY + 25;
  doc.font("Helvetica").fontSize(8).fillColor("#000000");

  data.items.forEach((item, i) => {
    const code = item.code || `${i + 1}`;
    const name = item.description || "-";
    const unitPrice = Number(item.unitPrice || 0).toFixed(2);
    const total = Number(item.total || 0).toFixed(2);
    const qty = String(item.quantity || 0);
    const discount = Number(item.discount || 0).toFixed(2);

    const rowH = rowHeights[i];
    const codeHeight = doc.heightOfString(code, { width: widthCod });
    const nameHeight = doc.heightOfString(name, { width: widthNombre });

    const offsetCodeY = rowY + (rowH - codeHeight) / 2;
    const offsetNameY = rowY + (rowH - nameHeight) / 2;
    const centerY = rowY + (rowH - 8) / 2;

    doc.text(code, colCod, offsetCodeY, { width: widthCod });
    doc.text(qty, colCant, centerY);
    doc.text(name, colNombre, offsetNameY, { width: widthNombre });
    doc.text(`$${unitPrice}`, colPrecioUnit, centerY, {
      width: 70,
      align: "right",
    });
    doc.text(`$${discount}`, colDesc, centerY, {
      width: 70,
      align: "right",
    });
    doc.text(`$${total}`, colTotal, centerY, {
      width: 70,
      align: "right",
    });

    rowY += rowH;
  });

  // ==========================================
  // 4. SECCIÓN FINAL: INFORMACIÓN ADICIONAL, PAGOS Y TOTALES
  // ==========================================
  let finalTop = rowY + 16;
  if (finalTop + 200 > doc.page.height - 20) {
    doc.addPage();
    finalTop = 25;
  }

  const leftBoxWidth = usableWidth * 0.6 + 20;
  const rightBoxWidthT = usableWidth * 0.3 + 20;
  const gapFinal = usableWidth - leftBoxWidth - rightBoxWidthT;

  const leftX = margin;
  const rightX = leftX + leftBoxWidth + gapFinal;

  // --- Caja Izquierda 1: Información Adicional
  const titleText = "Información adicional";
  const titleW = doc.widthOfString(titleText);
  const titleX = leftX + (leftBoxWidth - titleW) / 2;

  const additionalLines: Array<{ label?: string; value?: string; text?: string }> = [];
  data.infoAdicional.forEach((info) => {
    additionalLines.push({ label: info.nombre, value: info.valor });
  });

  if (options.companyData?.infoText) {
    additionalLines.push({ text: options.companyData.infoText });
  }

  const infoTextWidth = leftBoxWidth - 20;
  const infoBoxHeight = additionalLines.reduce((acc, line) => {
    const txt = line.label ? `${line.label}: ${line.value || "-"}` : line.text || "-";
    return acc + doc.heightOfString(txt, { width: infoTextWidth, lineGap: 2 }) + 5;
  }, 0);

  const finalInfoBoxHeight = Math.max(infoBoxHeight + 30, 45);
  roundedRect(doc, leftX, finalTop, leftBoxWidth, finalInfoBoxHeight, 6);

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("#000000")
    .text(titleText, titleX, finalTop + 10);

  let lineY = finalTop + 28;
  doc.font("Helvetica").fontSize(8).fillColor("#000000");

  additionalLines.forEach((line) => {
    const text = line.label ? `${line.label}: ${line.value || "-"}` : line.text || "-";
    if (line.label) {
      drawLabelValueColumns(doc, line.label, line.value, leftX + 10, lineY, {
        width: infoTextWidth,
        labelWidth: 88,
        lineGap: 2,
        fontSize: 8,
      });
    } else {
      doc.text(text, leftX + 10, lineY, {
        width: infoTextWidth,
        lineGap: 2,
      });
    }
    lineY += doc.heightOfString(text, { width: infoTextWidth, lineGap: 2 }) + 5;
  });

  // --- Caja Izquierda 2: Forma de Pago (Tabla)
  const table2Top = finalTop + finalInfoBoxHeight + 14;
  const colMethod = leftX + 10;
  const colPlazo = leftX + 10 + leftBoxWidth * 0.6;
  const colValor = leftX + 10 + leftBoxWidth * 0.8;
  const methodWidth = leftBoxWidth * 0.6 - 10;
  const plazoWidth = leftBoxWidth * 0.2 - 15;
  const valorWidth = leftBoxWidth * 0.2 - 15;

  doc.font("Helvetica-Bold").fontSize(8).fillColor("#000000");
  doc.text("Forma de pago", colMethod, table2Top, { width: methodWidth });
  doc.text("Plazo", colPlazo, table2Top, { width: plazoWidth, align: "right" });
  doc.text("Valor", colValor, table2Top, { width: valorWidth, align: "right" });

  doc
    .moveTo(leftX + 5, table2Top + 12)
    .lineTo(leftX + leftBoxWidth - 5, table2Top + 12)
    .stroke();

  let row2Y = table2Top + 18;
  doc.font("Helvetica").fontSize(8).fillColor("#000000");

  const pagosList =
    data.pagos.length > 0
      ? data.pagos
      : [
          {
            formaPago: "SIN UTILIZACION DEL SISTEMA FINANCIERO",
            plazo: "0",
            total: data.totales.importeTotal,
          },
        ];

  pagosList.forEach((item) => {
    doc.text(item.formaPago, colMethod, row2Y, { width: methodWidth });
    doc.text(item.plazo || "0", colPlazo, row2Y, { width: plazoWidth, align: "right" });
    doc.text(`$${Number(item.total).toFixed(2)}`, colValor, row2Y, {
      width: valorWidth,
      align: "right",
    });
    row2Y += 15;
  });

  const table2Height = (pagosList.length + 1) * 15 + 10;
  roundedRect(doc, leftX, table2Top - 5, leftBoxWidth, table2Height, 6);

  let leftContentBottom = table2Top + table2Height;
  if (options.companyData?.termsText) {
    leftContentBottom += 15;
    const termsHeight = drawCustomTextBox(doc, {
      x: leftX,
      y: leftContentBottom,
      width: leftBoxWidth,
      title: "Términos y condiciones",
      text: options.companyData.termsText,
    });
    leftContentBottom += termsHeight;
  }

  if (options.companyData?.footerText) {
    leftContentBottom += 15;
    drawCustomTextBox(doc, {
      x: leftX,
      y: leftContentBottom,
      width: leftBoxWidth,
      title: "Pie de factura",
      text: options.companyData.footerText,
    });
  }

  // --- Caja Derecha: Totales
  const subtotalsMap: Record<string, { label: string; base: number; iva: number }> = {};
  data.totales.impuestos.forEach((tax) => {
    const cp = tax.codigoPorcentaje;
    const base = Number(tax.baseImponible) || 0;
    const iva = Number(tax.valor) || 0;
    if (!subtotalsMap[cp]) {
      subtotalsMap[cp] = { label: tax.label || `Subtotal ${tax.tarifa || ""}%:`, base, iva };
    } else {
      subtotalsMap[cp].base += base;
      subtotalsMap[cp].iva += iva;
    }
  });

  const titlesAndValues: Array<{ title: string; val: number }> = [
    { title: "Subtotal sin impuesto:", val: Number(data.totales.subtotalSinImpuestos) },
  ];

  if (subtotalsMap["4"]) {
    titlesAndValues.push({ title: "Subtotal 15%:", val: subtotalsMap["4"].base });
  } else if (subtotalsMap["2"]) {
    titlesAndValues.push({ title: "Subtotal 12%:", val: subtotalsMap["2"].base });
  } else {
    titlesAndValues.push({ title: "Subtotal 15%:", val: 0 });
  }

  titlesAndValues.push({
    title: "Subtotal no objeto de IVA:",
    val: subtotalsMap["6"] ? subtotalsMap["6"].base : 0,
  });

  titlesAndValues.push({
    title: "Subtotal Exento IVA:",
    val: subtotalsMap["7"] ? subtotalsMap["7"].base : 0,
  });

  titlesAndValues.push({
    title: "Descuento:",
    val: Number(data.totales.totalDescuento),
  });

  titlesAndValues.push({ title: "ICE:", val: 0 });
  titlesAndValues.push({ title: "IRBPNR:", val: 0 });

  if (subtotalsMap["4"] && subtotalsMap["4"].iva > 0) {
    titlesAndValues.push({ title: "IVA 15%:", val: subtotalsMap["4"].iva });
  } else if (subtotalsMap["2"] && subtotalsMap["2"].iva > 0) {
    titlesAndValues.push({ title: "IVA 12%:", val: subtotalsMap["2"].iva });
  } else {
    titlesAndValues.push({ title: "IVA 15%:", val: 0 });
  }

  if (Number(data.totales.propina) > 0) {
    titlesAndValues.push({ title: "Propina:", val: Number(data.totales.propina) });
  }

  titlesAndValues.push({
    title: "Valor total:",
    val: Number(data.totales.importeTotal),
  });

  const numRows = titlesAndValues.length;
  const rowHeight = 20;
  const totalBoxHeightT = numRows * rowHeight;

  roundedRect(doc, rightX, finalTop, rightBoxWidthT, totalBoxHeightT, 6);
  doc.fontSize(8).font("Helvetica").fillColor("#000000");

  for (let i = 0; i < numRows; i++) {
    const y = finalTop + i * rowHeight;
    if (i > 0) {
      doc
        .moveTo(rightX, y)
        .lineTo(rightX + rightBoxWidthT, y)
        .stroke();
    }

    const labelWidth = rightBoxWidthT * 0.6;
    const valueWidth = rightBoxWidthT * 0.4;
    const isTotal = i === numRows - 1;

    doc
      .font(isTotal ? "Helvetica-Bold" : "Helvetica")
      .text(titlesAndValues[i].title, rightX + 8, y + 6, {
        width: labelWidth - 8,
        align: "left",
      });

    doc.font("Helvetica-Bold").text(
      `$${titlesAndValues[i].val.toFixed(2)}`,
      rightX + labelWidth,
      y + 6,
      {
        width: valueWidth - 8,
        align: "right",
      }
    );
  }
}

/**
 * Alias de compatibilidad hacia atrás
 */
export const renderFullmegasTemplate = renderAlternativeTemplate;
