import { Invoice, InvoiceInput } from "../baseData/invoice/invoice";
import { generateAccessKey } from "../utils/utils";
import { buildXml } from "../utils/xml";

export function generateInvoiceXml(invoice: Invoice): string {
  return buildXml(invoice as unknown as Record<string, unknown>);
}

export function generateInvoice(invoiceData: InvoiceInput): {
  invoice: Invoice;
  accessKey: string;
} {
  const accessKey = generateAccessKey({
    date: invoiceData.infoFactura.fechaEmision,
    codDoc: invoiceData.infoTributaria.codDoc as any,
    ruc: invoiceData.infoTributaria.ruc,
    environment: invoiceData.infoTributaria.ambiente,
    establishment: invoiceData.infoTributaria.estab,
    emissionPoint: invoiceData.infoTributaria.ptoEmi,
    sequential: invoiceData.infoTributaria.secuencial,
  });

  const invoice: Invoice = {
    factura: {
      "@id": "comprobante",
      "@version": invoiceData.version ?? "1.0.0",
      infoTributaria: { ...invoiceData.infoTributaria, claveAcceso: accessKey },
      infoFactura: invoiceData.infoFactura,
      detalles: invoiceData.detalles,
      ...(invoiceData.reembolsos ? { reembolsos: invoiceData.reembolsos } : {}),
      ...(invoiceData.retenciones ? { retenciones: invoiceData.retenciones } : {}),
      ...(invoiceData.infoSustitutivaGuiaRemision
        ? { infoSustitutivaGuiaRemision: invoiceData.infoSustitutivaGuiaRemision }
        : {}),
      ...(invoiceData.otrosRubrosTerceros
        ? { otrosRubrosTerceros: invoiceData.otrosRubrosTerceros }
        : {}),
      ...(invoiceData.tipoNegociable
        ? { tipoNegociable: invoiceData.tipoNegociable }
        : {}),
      ...(invoiceData.maquinaFiscal
        ? { maquinaFiscal: invoiceData.maquinaFiscal }
        : {}),
      ...(invoiceData.infoAdicional
        ? { infoAdicional: invoiceData.infoAdicional }
        : {}),
    },
  };

  return { invoice, accessKey };
}
