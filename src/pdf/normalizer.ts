import { parseXml } from "../utils/xml";
import { NormalizedRideData, NormalizedItem, NormalizedTaxTotal, RidePdfOptions } from "./types";

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

export function normalizeRideData(
  input: any,
  options?: RidePdfOptions
): NormalizedRideData {
  let doc: any = input;

  // Si llega un string XML, parsearlo
  if (typeof input === "string") {
    doc = parseXml(input);
  }

  // Identificar raíz (factura, liquidacionCompra, etc.)
  const factura = doc?.factura || doc?.liquidacionCompra || doc;
  const infoTributaria = factura?.infoTributaria || {};
  const infoFactura = factura?.infoFactura || factura?.infoLiquidacionCompra || {};
  const detallesObj = factura?.detalles?.detalle || [];
  const itemsArray = Array.isArray(detallesObj) ? detallesObj : [detallesObj];

  const estab = String(infoTributaria.estab || "001").padStart(3, "0");
  const ptoEmi = String(infoTributaria.ptoEmi || "001").padStart(3, "0");
  const secuencial = String(infoTributaria.secuencial || "1").padStart(9, "0");
  const numeroComprobante = `${estab}-${ptoEmi}-${secuencial}`;

  const claveAcceso = String(infoTributaria.claveAcceso || "");
  const codDoc = String(infoTributaria.codDoc || "01");

  const tipoComprobante =
    codDoc === "03" ? "LIQUIDACIÓN DE COMPRA" : "FACTURA";

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

  // Normalizar Items
  const items: NormalizedItem[] = itemsArray
    .filter((d: any) => d && (d.descripcion || d.codigoPrincipal))
    .map((d: any, idx: number) => ({
      code: String(d.codigoPrincipal || d.codigo || idx + 1),
      auxCode: d.codigoAuxiliar ? String(d.codigoAuxiliar) : undefined,
      description: String(d.descripcion || "-"),
      quantity: d.cantidad || "1",
      unitPrice: d.precioUnitario || "0.00",
      discount: d.descuento || "0.00",
      total: d.precioTotalSinImpuesto || "0.00",
    }));

  // Normalizar Impuestos Totales
  const totalImpuestoRaw =
    infoFactura?.totalConImpuestos?.totalImpuesto || [];
  const taxArray = Array.isArray(totalImpuestoRaw)
    ? totalImpuestoRaw
    : [totalImpuestoRaw];

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
        tarifa: t.tarifa ? String(t.tarifa) : undefined,
        baseImponible: String(t.baseImponible || "0.00"),
        valor: String(t.valor || "0.00"),
        label,
      };
    });

  // Normalizar Pagos
  const pagosRaw = infoFactura?.pagos?.pago || [];
  const pagosArray = Array.isArray(pagosRaw) ? pagosRaw : [pagosRaw];
  const pagos = pagosArray
    .filter((p: any) => p && (p.formaPago || p.total))
    .map((p: any) => ({
      formaPago: FORMAS_PAGO[String(p.formaPago)] || String(p.formaPago || "01"),
      total: String(p.total || infoFactura.importeTotal || "0.00"),
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
      totalDescuento: String(infoFactura.totalDescuento || "0.00"),
      impuestos,
      propina: String(infoFactura.propina || "0.00"),
      importeTotal: String(infoFactura.importeTotal || "0.00"),
      moneda: String(infoFactura.moneda || "DOLAR"),
    },

    pagos,
    infoAdicional,
  };
}
