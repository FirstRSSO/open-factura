export type AdditionalDetail = {
  "@nombre": string;
  "@valor": string;
};

export type AdditionalDetails = {
  detAdicional: AdditionalDetail[];
};

export type Tax = {
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
  tarifa: string;
  baseImponible: string;
  valor: string;
};

export type Taxes = {
  impuesto: Tax[];
};

export type Detail = {
  codigoPrincipal: string;
  codigoAuxiliar?: string;
  descripcion: string;
  unidadMedida?: string;
  cantidad: string;
  precioUnitario: string;
  precioSinSubsidio?: string;
  descuento: string;
  precioTotalSinImpuesto: string;
  detallesAdicionales?: AdditionalDetails;
  impuestos: Taxes;
};

export type Details = {
  detalle: Detail[];
};

const aditionalDetails: AdditionalDetails = {
  detAdicional: [
    {
      "@nombre": "nombre0",
      "@valor": "valor0",
    },
    {
      "@nombre": "nombre1",
      "@valor": "valor1",
    },
  ],
};

const taxes: Taxes = {
  impuesto: [
    {
      codigo: "2",
      codigoPorcentaje: "4",
      tarifa: "15.00",
      baseImponible: "50.00",
      valor: "7.50",
    },
  ],
};

export const details: Details = {
  detalle: [
    {
      codigoPrincipal: "codigoPrincipal0",
      codigoAuxiliar: "codigoAuxiliar0",
      descripcion: "descripcion0",
      unidadMedida: "unidadMedida0",
      cantidad: "50.000000",
      precioUnitario: "50.000000",
      precioSinSubsidio: "50.000000",
      descuento: "50.00",
      precioTotalSinImpuesto: "50.00",
      detallesAdicionales: aditionalDetails,
      impuestos: taxes,
    },
    {
      codigoPrincipal: "codigoPrincipal1",
      codigoAuxiliar: "codigoAuxiliar1",
      descripcion: "descripcion1",
      unidadMedida: "unidadMedida1",
      cantidad: "50.000000",
      precioUnitario: "50.000000",
      precioSinSubsidio: "50.000000",
      descuento: "50.00",
      precioTotalSinImpuesto: "50.00",
      detallesAdicionales: aditionalDetails,
      impuestos: taxes,
    },
  ],
};
