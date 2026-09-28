export type InvoiceInfo = {
  fechaEmision: string;
  dirEstablecimiento?: string;
  contribuyenteEspecial?: string;
  obligadoContabilidad: "SI" | "NO" | string;
  comercioExterior?: string;
  incoTermFactura?: string;
  lugarIncoTerm?: string;
  paisOrigen?: string;
  puertoEmbarque?: string;
  puertoDestino?: string;
  paisDestino?: string;
  paisAdquisicion?: string;
  /*
  Tipo Identificación Comprador:
  04: RUC
  05: CÉDULA
  06: PASAPORTE
  07: CONSUMIDOR FINAL
  08: IDENTIFICACIÓN DEL EXTERIOR
  */
  tipoIdentificacionComprador: "04" | "05" | "06" | "07" | "08" | string;
  guiaRemision?: string;
  razonSocialComprador: string;
  identificacionComprador: string;
  direccionComprador?: string;
  totalSinImpuestos: string;
  totalSubsidio?: string;
  incoTermTotalSinImpuestos?: string;
  totalDescuento: string;
  codDocReembolso?: string;
  totalComprobantesReembolso?: string;
  totalBaseImponibleReembolso?: string;
  totalImpuestoReembolso?: string;
  totalConImpuestos: TotalWithTaxes;
  compensaciones?: Compensations;
  propina?: string;
  fleteInternacional?: string;
  seguroInternacional?: string;
  gastosAduaneros?: string;
  gastosTransporteOtros?: string;
  importeTotal: string;
  moneda?: string;
  placa?: string;
  pagos: Payments;
  valorRetIva?: string;
  valorRetRenta?: string;
};

export type TotalWithTax = {
  /*
  Código de impuesto:
  2: IVA
  3: ICE
  5: IRBPNR
  */
  codigo: "2" | "3" | "5" | string;
  /*
  Código Porcentaje IVA (Tabla 17 Ficha Técnica SRI):
  0: 0%
  2: 12%
  3: 14%
  4: 15% (vigente)
  5: 5% (materiales de construcción)
  6: No Objeto de Impuesto
  7: Exento de IVA
  8: IVA diferenciado
  10: 13%
  */
  codigoPorcentaje:
    | "0"
    | "2"
    | "3"
    | "4"
    | "5"
    | "6"
    | "7"
    | "8"
    | "10"
    | string;
  descuentoAdicional?: string;
  baseImponible: string;
  tarifa?: string;
  valor: string;
  valorDevolucionIva?: string;
};

export type TotalWithTaxes = {
  totalImpuesto: TotalWithTax[];
};

export type Compensation = {
  codigo: string;
  tarifa: string;
  valor: string;
};

export type Compensations = {
  compensacion: Compensation[];
};

export type Payment = {
  formaPago: string;
  total: string;
  plazo?: string;
  unidadTiempo?: string;
};

export type Payments = {
  pago: Payment[];
};

const totalWithTaxes: TotalWithTaxes = {
  totalImpuesto: [
    {
      codigo: "2",
      codigoPorcentaje: "4",
      descuentoAdicional: "0.00",
      baseImponible: "50.00",
      tarifa: "15.00",
      valor: "7.50",
      valorDevolucionIva: "0.00",
    },
  ],
};

const compensations: Compensations = {
  compensacion: [
    {
      codigo: "1",
      tarifa: "49.50",
      valor: "50.00",
    },
  ],
};

const payments: Payments = {
  pago: [
    {
      formaPago: "01",
      total: "57.50",
      plazo: "0",
      unidadTiempo: "dias",
    },
  ],
};

export const invoiceInfo: InvoiceInfo = {
  fechaEmision: "01/01/2026",
  dirEstablecimiento: "dirEstablecimiento0",
  contribuyenteEspecial: "contribuyente",
  obligadoContabilidad: "SI",
  comercioExterior: "EXPORTADOR",
  incoTermFactura: "A",
  lugarIncoTerm: "lugarIncoTerm0",
  paisOrigen: "000",
  puertoEmbarque: "puertoEmbarque0",
  puertoDestino: "puertoDestino0",
  paisDestino: "000",
  paisAdquisicion: "000",
  tipoIdentificacionComprador: "04",
  guiaRemision: "000-000-000000000",
  razonSocialComprador: "razonSocialComprador0",
  identificacionComprador: "identificacionComprador0",
  direccionComprador: "direccionComprador0",
  totalSinImpuestos: "50.00",
  totalSubsidio: "50.00",
  incoTermTotalSinImpuestos: "A",
  totalDescuento: "0.00",
  codDocReembolso: "00",
  totalComprobantesReembolso: "50.00",
  totalBaseImponibleReembolso: "50.00",
  totalImpuestoReembolso: "50.00",
  totalConImpuestos: totalWithTaxes,
  compensaciones: compensations,
  propina: "0.00",
  fleteInternacional: "0.00",
  seguroInternacional: "0.00",
  gastosAduaneros: "0.00",
  gastosTransporteOtros: "0.00",
  importeTotal: "57.50",
  moneda: "DOLAR",
  placa: "placa0",
  pagos: payments,
  valorRetIva: "0.00",
  valorRetRenta: "0.00",
};
