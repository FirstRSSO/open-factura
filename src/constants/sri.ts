export const SRI_ENDPOINTS = {
  test: {
    reception:
      "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline",
    authorization:
      "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline",
  },
  production: {
    reception:
      "https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline",
    authorization:
      "https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline",
  },
} as const;

export const SRI_DOCUMENT_CODES = {
  FACTURA: "01",
  LIQUIDACION_COMPRA: "03",
  NOTA_CREDITO: "04",
  NOTA_DEBITO: "05",
  GUIA_REMISION: "06",
  COMPROBANTE_RETENCION: "07",
} as const;

export const SRI_TAX_CODES = {
  IVA: "2",
  ICE: "3",
  IRBPNR: "5",
} as const;

export const SRI_IVA_PERCENTAGES = {
  IVA_0: "0",
  IVA_12: "2",
  IVA_14: "3",
  IVA_15: "4", // Tarifa 15% vigente
  IVA_5: "5",  // Materiales de construcción
  NO_OBJETO: "6",
  EXENTO: "7",
  IVA_DIFERENCIADO: "8",
  IVA_13: "10",
} as const;

export const SRI_RIMPE_LEGENDS = {
  EMPRENDEDOR: "CONTRIBUYENTE RÉGIMEN RIMPE",
  NEGOCIO_POPULAR: "CONTRIBUYENTE NEGOCIO POPULAR - RÉGIMEN RIMPE",
} as const;
