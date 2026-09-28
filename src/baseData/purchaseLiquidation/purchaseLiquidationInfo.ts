import { Payments, TotalWithTaxes } from "../invoice/invoiceInfo";
import { Reimbursements } from "../invoice/reimbursements";

export type PurchaseLiquidationInfo = {
  fechaEmision: string;
  dirEstablecimiento?: string;
  contribuyenteEspecial?: string;
  obligadoContabilidad: "SI" | "NO" | string;
  /*
  Tipo Identificación Proveedor (Tabla 6 SRI):
  04: RUC
  05: CÉDULA
  06: PASAPORTE
  07: CONSUMIDOR FINAL
  08: IDENTIFICACIÓN DEL EXTERIOR
  */
  tipoIdentificacionProveedor: "04" | "05" | "06" | "07" | "08" | string;
  razonSocialProveedor: string;
  identificacionProveedor: string;
  direccionProveedor?: string;
  totalSinImpuestos: string;
  totalDescuento: string;
  codDocReembolso?: string;
  totalComprobantesReembolso?: string;
  totalBaseImponibleReembolso?: string;
  totalImpuestoReembolso?: string;
  totalConImpuestos: TotalWithTaxes;
  importeTotal: string;
  moneda?: string;
  pagos: Payments;
  reembolsos?: Reimbursements;
};

export const purchaseLiquidationInfo: PurchaseLiquidationInfo = {
  fechaEmision: "01/01/2026",
  dirEstablecimiento: "dirEstablecimiento0",
  obligadoContabilidad: "NO",
  tipoIdentificacionProveedor: "05",
  razonSocialProveedor: "PROVEEDOR EJEMPLO",
  identificacionProveedor: "1712345678",
  direccionProveedor: "DIRECCION PROVEEDOR 123",
  totalSinImpuestos: "100.00",
  totalDescuento: "0.00",
  totalConImpuestos: {
    totalImpuesto: [
      {
        codigo: "2",
        codigoPorcentaje: "4",
        baseImponible: "100.00",
        tarifa: "15.00",
        valor: "15.00",
      },
    ],
  },
  importeTotal: "115.00",
  moneda: "DOLAR",
  pagos: {
    pago: [
      {
        formaPago: "01",
        total: "115.00",
        plazo: "0",
        unidadTiempo: "dias",
      },
    ],
  },
};
