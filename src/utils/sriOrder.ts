import { TaxInfo } from "../baseData/invoice/taxInfo";
import { InvoiceInfo, TotalWithTax, Payment } from "../baseData/invoice/invoiceInfo";
import { Detail, Tax } from "../baseData/invoice/details";
import { Invoice } from "../baseData/invoice/invoice";
import { PurchaseLiquidation } from "../baseData/purchaseLiquidation/purchaseLiquidation";
import { PurchaseLiquidationInfo } from "../baseData/purchaseLiquidation/purchaseLiquidationInfo";

function orderObject<T extends Record<string, any>>(
  obj: T,
  order: readonly string[]
): T {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return obj;
  }

  const ordered: Record<string, unknown> = {};

  // 1. Insertar propiedades en el orden estricto de la especificación XSD
  for (const key of order) {
    if (obj[key] !== undefined && obj[key] !== null) {
      ordered[key] = obj[key];
    }
  }

  // 2. Insertar cualquier propiedad adicional preservando su valor
  for (const [key, value] of Object.entries(obj)) {
    if (!(key in ordered) && value !== undefined && value !== null) {
      ordered[key] = value;
    }
  }

  return ordered as T;
}

/**
 * Orden estricto según XSD oficial del SRI para <infoTributaria>
 */
export const SRI_INFO_TRIBUTARIA_ORDER = [
  "ambiente",
  "tipoEmision",
  "razonSocial",
  "nombreComercial",
  "ruc",
  "claveAcceso",
  "codDoc",
  "estab",
  "ptoEmi",
  "secuencial",
  "dirMatriz",
  "regimenMicroempresas",
  "agenteRetencion",
  "contribuyenteRimpe",
] as const;

export function orderInfoTributaria(data: TaxInfo): TaxInfo {
  return orderObject(data, SRI_INFO_TRIBUTARIA_ORDER);
}

/**
 * Orden estricto según XSD oficial del SRI para <infoFactura>
 */
export const SRI_INFO_FACTURA_ORDER = [
  "fechaEmision",
  "dirEstablecimiento",
  "contribuyenteEspecial",
  "obligadoContabilidad",
  "comercioExterior",
  "incoTermFactura",
  "lugarIncoTerm",
  "paisOrigen",
  "puertoEmbarque",
  "puertoDestino",
  "paisDestino",
  "paisAdquisicion",
  "tipoIdentificacionComprador",
  "guiaRemision",
  "razonSocialComprador",
  "identificacionComprador",
  "direccionComprador",
  "totalSinImpuestos",
  "totalSubsidio",
  "incoTermTotalSinImpuestos",
  "totalDescuento",
  "codDocReembolso",
  "totalComprobantesReembolso",
  "totalBaseImponibleReembolso",
  "totalImpuestoReembolso",
  "totalConImpuestos",
  "compensaciones",
  "propina",
  "fleteInternacional",
  "seguroInternacional",
  "gastosAduaneros",
  "gastosTransporteOtros",
  "importeTotal",
  "moneda",
  "placa",
  "pagos",
  "valorRetIva",
  "valorRetRenta",
] as const;

export const SRI_TOTAL_IMPUESTO_ORDER = [
  "codigo",
  "codigoPorcentaje",
  "descuentoAdicional",
  "baseImponible",
  "tarifa",
  "valor",
  "valorDevolucionIva",
] as const;

export const SRI_PAGO_ORDER = [
  "formaPago",
  "total",
  "plazo",
  "unidadTiempo",
] as const;

export function orderInfoFactura(data: InvoiceInfo): InvoiceInfo {
  const ordered = orderObject(data, SRI_INFO_FACTURA_ORDER);

  if (ordered.totalConImpuestos?.totalImpuesto) {
    const list = Array.isArray(ordered.totalConImpuestos.totalImpuesto)
      ? ordered.totalConImpuestos.totalImpuesto
      : [ordered.totalConImpuestos.totalImpuesto];
    ordered.totalConImpuestos = {
      totalImpuesto: list.map((item) => orderObject(item, SRI_TOTAL_IMPUESTO_ORDER)),
    };
  }

  if (ordered.pagos?.pago) {
    const list = Array.isArray(ordered.pagos.pago)
      ? ordered.pagos.pago
      : [ordered.pagos.pago];
    ordered.pagos = {
      pago: list.map((item) => orderObject(item, SRI_PAGO_ORDER)),
    };
  }

  return ordered;
}

/**
 * Orden estricto según XSD oficial del SRI para <detalle> e <impuesto>
 */
export const SRI_DETALLE_ORDER = [
  "codigoPrincipal",
  "codigoAuxiliar",
  "descripcion",
  "unidadMedida",
  "cantidad",
  "precioUnitario",
  "precioSinSubsidio",
  "descuento",
  "precioTotalSinImpuesto",
  "detallesAdicionales",
  "impuestos",
] as const;

export const SRI_IMPUESTO_DETALLE_ORDER = [
  "codigo",
  "codigoPorcentaje",
  "tarifa",
  "baseImponible",
  "valor",
] as const;

export function orderDetail(detail: Detail): Detail {
  const ordered = orderObject(detail, SRI_DETALLE_ORDER);
  if (ordered.impuestos?.impuesto) {
    const list = Array.isArray(ordered.impuestos.impuesto)
      ? ordered.impuestos.impuesto
      : [ordered.impuestos.impuesto];
    ordered.impuestos = {
      impuesto: list.map((item) => orderObject(item, SRI_IMPUESTO_DETALLE_ORDER)),
    };
  }
  return ordered;
}

/**
 * Orden estricto según XSD oficial del SRI para raíz <factura>
 */
export const SRI_FACTURA_ROOT_ORDER = [
  "@id",
  "@version",
  "infoTributaria",
  "infoFactura",
  "detalles",
  "reembolsos",
  "retenciones",
  "infoSustitutivaGuiaRemision",
  "otrosRubrosTerceros",
  "tipoNegociable",
  "maquinaFiscal",
  "infoAdicional",
] as const;

export function orderInvoice(invoice: Invoice): Invoice {
  const factura = invoice.factura;
  const orderedFactura = orderObject(factura, SRI_FACTURA_ROOT_ORDER);

  if (orderedFactura.infoTributaria) {
    orderedFactura.infoTributaria = orderInfoTributaria(orderedFactura.infoTributaria);
  }

  if (orderedFactura.infoFactura) {
    orderedFactura.infoFactura = orderInfoFactura(orderedFactura.infoFactura);
  }

  if (orderedFactura.detalles?.detalle) {
    const list = Array.isArray(orderedFactura.detalles.detalle)
      ? orderedFactura.detalles.detalle
      : [orderedFactura.detalles.detalle];
    orderedFactura.detalles = {
      detalle: list.map(orderDetail),
    };
  }

  return { factura: orderedFactura };
}

/**
 * Orden estricto según XSD oficial del SRI para <infoLiquidacionCompra>
 */
export const SRI_INFO_LIQUIDACION_COMPRA_ORDER = [
  "fechaEmision",
  "dirEstablecimiento",
  "contribuyenteEspecial",
  "obligadoContabilidad",
  "tipoIdentificacionProveedor",
  "razonSocialProveedor",
  "identificacionProveedor",
  "direccionProveedor",
  "totalSinImpuestos",
  "totalDescuento",
  "codDocReembolso",
  "totalComprobantesReembolso",
  "totalBaseImponibleReembolso",
  "totalImpuestoReembolso",
  "totalConImpuestos",
  "importeTotal",
  "moneda",
  "pagos",
  "reembolsos",
] as const;

export const SRI_LIQUIDACION_ROOT_ORDER = [
  "@id",
  "@version",
  "infoTributaria",
  "infoLiquidacionCompra",
  "detalles",
  "reembolsos",
  "retenciones",
  "maquinaFiscal",
  "infoAdicional",
] as const;

export function orderPurchaseLiquidation(
  liquidation: PurchaseLiquidation
): PurchaseLiquidation {
  const root = liquidation.liquidacionCompra;
  const orderedRoot = orderObject(root, SRI_LIQUIDACION_ROOT_ORDER);

  if (orderedRoot.infoTributaria) {
    orderedRoot.infoTributaria = orderInfoTributaria(orderedRoot.infoTributaria);
  }

  if (orderedRoot.infoLiquidacionCompra) {
    const info = orderObject(
      orderedRoot.infoLiquidacionCompra,
      SRI_INFO_LIQUIDACION_COMPRA_ORDER
    );
    if (info.totalConImpuestos?.totalImpuesto) {
      const list = Array.isArray(info.totalConImpuestos.totalImpuesto)
        ? info.totalConImpuestos.totalImpuesto
        : [info.totalConImpuestos.totalImpuesto];
      info.totalConImpuestos = {
        totalImpuesto: list.map((item) =>
          orderObject(item, SRI_TOTAL_IMPUESTO_ORDER)
        ),
      };
    }
    if (info.pagos?.pago) {
      const list = Array.isArray(info.pagos.pago)
        ? info.pagos.pago
        : [info.pagos.pago];
      info.pagos = {
        pago: list.map((item) => orderObject(item, SRI_PAGO_ORDER)),
      };
    }
    orderedRoot.infoLiquidacionCompra = info;
  }

  if (orderedRoot.detalles?.detalle) {
    const list = Array.isArray(orderedRoot.detalles.detalle)
      ? orderedRoot.detalles.detalle
      : [orderedRoot.detalles.detalle];
    orderedRoot.detalles = {
      detalle: list.map(orderDetail),
    };
  }

  return { liquidacionCompra: orderedRoot };
}
