export type ContribuyenteRimpe =
  | "CONTRIBUYENTE RÉGIMEN RIMPE"
  | "CONTRIBUYENTE NEGOCIO POPULAR - RÉGIMEN RIMPE"
  | "CONTRIBUYENTE RÉGIMEN RIMPE - EMPRENDEDOR"
  | "CONTRIBUYENTE RÉGIMEN RIMPE - NEGOCIO POPULAR"
  | (string & {});

export type TaxInfo = {
  /*
  Ambiente:
  1: Pruebas
  2: Producción
  */
  ambiente: "1" | "2";
  tipoEmision: "1" | string;
  razonSocial: string;
  nombreComercial?: string;
  ruc: string;
  claveAcceso: string;
  /*
  Códigos de comprobante SRI:
  01: FACTURA
  03: LIQUIDACIÓN DE COMPRA DE BIENES Y PRESTACIÓN DE SERVICIOS
  04: NOTA DE CRÉDITO
  05: NOTA DE DÉBITO
  06: GUÍA DE REMISIÓN
  07: COMPROBANTE DE RETENCIÓN
  */
  codDoc: "01" | "03" | "04" | "05" | "06" | "07" | string;
  estab: string;
  ptoEmi: string;
  secuencial: string;
  dirMatriz: string;
  regimenMicroempresas?: "CONTRIBUYENTE RÉGIMEN MICROEMPRESAS" | string;
  agenteRetencion?: string;
  contribuyenteRimpe?: ContribuyenteRimpe;
};

export const taxInfo: TaxInfo = {
  ambiente: "1",
  tipoEmision: "1",
  razonSocial: "razonSocial0",
  nombreComercial: "nombreComercial0",
  ruc: "0000000000001",
  claveAcceso: "0000000000000000000000000000000000000000000000000",
  codDoc: "01",
  estab: "000",
  ptoEmi: "000",
  secuencial: "000000000",
  dirMatriz: "dirMatriz0",
  agenteRetencion: "0",
  contribuyenteRimpe: "CONTRIBUYENTE RÉGIMEN RIMPE",
};
