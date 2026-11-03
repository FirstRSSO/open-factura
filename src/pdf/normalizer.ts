import { parseXml } from "../utils/xml";
import {
  NormalizedDebitReason,
  NormalizedModifiedDocument,
  NormalizedRideData,
  NormalizedItem,
  NormalizedTaxTotal,
  RidePdfOptions,
} from "./types";
import { rideDocumentTitle } from "./document-kind";

/** Un nodo repetible del XML llega como objeto si solo hay uno. */
function asArray(value: any): any[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

const FORMAS_PAGO: Record<string, string> = {
  "01": "SIN UTILIZACIÓN DEL SISTEMA FINANCIERO",
  "15": "COMPENSACIÓN DE DEUDAS",
  "16": "TARJETA DE DÉBITO",
  "17": "DINERO ELECTRÓNICO",
  "18": "TARJETA PREPAGO",
  "19": "TARJETA DE CRÉDITO",
  "20": "OTROS CON UTILIZACIÓN DEL SISTEMA FINANCIERO",
  "21": "ENDOSO DE TÍTULOS",
};

/**
 * Tarifa de IVA por `codigoPorcentaje`, para los comprobantes que no la
 * traen en sus totales (la nota de crédito no lleva `tarifa` en
 * `totalConImpuestos`).
 */
const IVA_RATE_BY_CODE: Record<string, string> = {
  "0": "0",
  "2": "12",
  "3": "14",
  "4": "15",
  "5": "5",
  "6": "0",
  "7": "0",
  "8": "8",
  "10": "13",
};

export function normalizeRideData(
  input: any,
  options?: RidePdfOptions
): NormalizedRideData {
  let doc: any = input;

  // Si llega un string XML, parsearlo
  if (typeof input === "string") {
    doc = parseXml(input);
  }

  // Identificar raíz (factura, liquidacionCompra, notaCredito, notaDebito)
  const factura =
    doc?.factura || doc?.liquidacionCompra || doc?.notaCredito || doc?.notaDebito || doc;
  const infoTributaria = factura?.infoTributaria || {};
  const infoFactura =
    factura?.infoFactura ||
    factura?.infoLiquidacionCompra ||
    factura?.infoNotaCredito ||
    factura?.infoNotaDebito ||
    {};
  const itemsArray = asArray(factura?.detalles?.detalle);

  const estab = String(infoTributaria.estab || "001").padStart(3, "0");
  const ptoEmi = String(infoTributaria.ptoEmi || "001").padStart(3, "0");
  const secuencial = String(infoTributaria.secuencial || "1").padStart(9, "0");
  const numeroComprobante = `${estab}-${ptoEmi}-${secuencial}`;

  const claveAcceso = String(infoTributaria.claveAcceso || "");
  const codDoc = String(infoTributaria.codDoc || "01");

  const tipoComprobante = rideDocumentTitle(codDoc);

  const authOpt = options?.authorization || {};
  const numeroAutorizacion =
    authOpt.numeroAutorizacion || claveAcceso || "-";
  const fechaAutorizacion =
    authOpt.fechaAutorizacion || infoFactura.fechaEmision || "-";
  const ambiente =
    authOpt.ambiente ||
    (infoTributaria.ambiente === "2" ? "PRODUCCIÓN" : "PRUEBAS");
  const tipoEmision =
    infoTributaria.tipoEmision === "1" ? "NORMAL" : "INDISPONIBILIDAD DEL SISTEMA";

  // Normalizar Items (la nota de crédito usa codigoInterno/codigoAdicional)
  const items: NormalizedItem[] = itemsArray
    .filter((d: any) => d && (d.descripcion || d.codigoPrincipal || d.codigoInterno))
    .map((d: any, idx: number) => ({
      code: String(d.codigoPrincipal || d.codigoInterno || d.codigo || idx + 1),
      auxCode:
        d.codigoAuxiliar || d.codigoAdicional
          ? String(d.codigoAuxiliar || d.codigoAdicional)
          : undefined,
      description: String(d.descripcion || "-"),
      quantity: d.cantidad || "1",
      unitPrice: d.precioUnitario || "0.00",
      discount: d.descuento || "0.00",
      total: d.precioTotalSinImpuesto || "0.00",
    }));

  // Normalizar Impuestos Totales (la nota de débito los lleva en `impuestos`)
  const taxArray = asArray(
    infoFactura?.totalConImpuestos?.totalImpuesto ?? infoFactura?.impuestos?.impuesto
  );

  const impuestos: NormalizedTaxTotal[] = taxArray
    .filter((t: any) => t && t.codigo)
    .map((t: any) => {
      let label = "SUBTOTAL";
      const cp = String(t.codigoPorcentaje);
      if (cp === "0") label = "SUBTOTAL 0%";
      else if (cp === "2") label = "SUBTOTAL 12%";
      else if (cp === "3") label = "SUBTOTAL 14%";
      else if (cp === "4") label = "SUBTOTAL 15%";
      else if (cp === "5") label = "SUBTOTAL 5%";
      else if (cp === "6") label = "SUBTOTAL NO OBJETO DE IVA";
      else if (cp === "7") label = "SUBTOTAL EXENTO DE IVA";
      else if (cp === "8") label = "SUBTOTAL IVA DIFERENCIADO";
      else if (cp === "10") label = "SUBTOTAL 13%";

      return {
        codigo: String(t.codigo),
        codigoPorcentaje: cp,
        tarifa: t.tarifa ? String(t.tarifa) : IVA_RATE_BY_CODE[cp],
        baseImponible: String(t.baseImponible || "0.00"),
        valor: String(t.valor || "0.00"),
        label,
      };
    });

  // Valor total: importeTotal (factura), valorModificacion (NC) o valorTotal (ND)
  const importeTotal = String(
    infoFactura.importeTotal || infoFactura.valorModificacion || infoFactura.valorTotal || "0.00"
  );

  // Normalizar Pagos
  const pagos = asArray(infoFactura?.pagos?.pago)
    .filter((p: any) => p && (p.formaPago || p.total))
    .map((p: any) => ({
      formaPago: FORMAS_PAGO[String(p.formaPago)] || String(p.formaPago || "01"),
      total: String(p.total || importeTotal),
      plazo: p.plazo ? String(p.plazo) : undefined,
      unidadTiempo: p.unidadTiempo ? String(p.unidadTiempo) : undefined,
    }));

  // Normalizar Info Adicional
  const infoAdicRaw = factura?.infoAdicional?.campoAdicional || [];
  const infoAdicArray = Array.isArray(infoAdicRaw) ? infoAdicRaw : [infoAdicRaw];
  const infoAdicional = infoAdicArray
    .filter((a: any) => a && (a["#"] || a["@nombre"] || typeof a === "string"))
    .map((a: any) => ({
      nombre: String(a["@nombre"] || "Campo"),
      valor: String(a["#"] || a.value || a || "-"),
    }));

  return {
    tipoComprobante,
    codDoc,
    numeroComprobante,
    claveAcceso,
    ambiente,
    tipoEmision,
    numeroAutorizacion,
    fechaAutorizacion,

    emisor: {
      razonSocial: String(infoTributaria.razonSocial || ""),
      nombreComercial: infoTributaria.nombreComercial
        ? String(infoTributaria.nombreComercial)
        : undefined,
      ruc: String(infoTributaria.ruc || ""),
      dirMatriz: String(infoTributaria.dirMatriz || ""),
      dirEstablecimiento: infoFactura.dirEstablecimiento
        ? String(infoFactura.dirEstablecimiento)
        : undefined,
      obligadoContabilidad: String(infoFactura.obligadoContabilidad || "NO"),
      contribuyenteEspecial:
        options?.companyData?.contribuyenteEspecial ||
        (infoFactura.contribuyenteEspecial
          ? String(infoFactura.contribuyenteEspecial)
          : undefined),
      agenteRetencion:
        options?.companyData?.agenteRetencion ||
        (infoTributaria.agenteRetencion
          ? String(infoTributaria.agenteRetencion)
          : undefined),
      contribuyenteRimpe:
        (options?.companyData?.regimenRimpe
          ? "CONTRIBUYENTE RÉGIMEN RIMPE"
          : undefined) ||
        (infoTributaria.contribuyenteRimpe
          ? String(infoTributaria.contribuyenteRimpe)
          : undefined),
    },

    comprador: {
      razonSocial: String(
        infoFactura.razonSocialComprador ||
          infoFactura.razonSocialProveedor ||
          "CONSUMIDOR FINAL"
      ),
      identificacion: String(
        infoFactura.identificacionComprador ||
          infoFactura.identificacionProveedor ||
          "9999999999999"
      ),
      tipoIdentificacion: String(
        infoFactura.tipoIdentificacionComprador ||
          infoFactura.tipoIdentificacionProveedor ||
          "07"
      ),
      direccion: infoFactura.direccionComprador || infoFactura.direccionProveedor,
      fechaEmision: String(infoFactura.fechaEmision || ""),
      guiaRemision: infoFactura.guiaRemision,
    },

    items,

    totales: {
      subtotalSinImpuestos: String(infoFactura.totalSinImpuestos || "0.00"),
      // La NC no trae totalDescuento: es la suma de los descuentos del detalle.
      totalDescuento: String(infoFactura.totalDescuento || sumDiscounts(items)),
      impuestos,
      propina: String(infoFactura.propina || "0.00"),
      importeTotal,
      moneda: String(infoFactura.moneda || "DOLAR"),
    },

    pagos,
    infoAdicional,
    documentoModificado: normalizeModifiedDocument(infoFactura),
    motivo: infoFactura.motivo ? String(infoFactura.motivo) : undefined,
    motivos: normalizeDebitReasons(factura?.motivos?.motivo),
  };
}

function sumDiscounts(items: NormalizedItem[]): string {
  return items.reduce((acc, item) => acc + (Number(item.discount) || 0), 0).toFixed(2);
}

function normalizeModifiedDocument(info: any): NormalizedModifiedDocument | undefined {
  if (!info?.codDocModificado) return undefined;
  const codDoc = String(info.codDocModificado);
  return {
    codDoc,
    tipo: rideDocumentTitle(codDoc),
    numero: String(info.numDocModificado || "-"),
    fechaEmision: String(info.fechaEmisionDocSustento || "-"),
  };
}

function normalizeDebitReasons(raw: any): NormalizedDebitReason[] | undefined {
  const reasons = asArray(raw)
    .filter((m: any) => m && (m.razon || m.valor))
    .map((m: any) => ({
      razon: String(m.razon || "-"),
      valor: String(m.valor || "0.00"),
    }));
  return reasons.length > 0 ? reasons : undefined;
}
