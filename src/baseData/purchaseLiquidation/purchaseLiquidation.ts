import { AdditionalInfo, additionalInfo } from "../invoice/additionalInfo";
import { Details, details } from "../invoice/details";
import { Reimbursements, reimbursements } from "../invoice/reimbursements";
import { Retentions, retentions } from "../invoice/retentions";
import { TaxInfo, taxInfo } from "../invoice/taxInfo";
import {
  PurchaseLiquidationInfo,
  purchaseLiquidationInfo,
} from "./purchaseLiquidationInfo";

export type PurchaseLiquidation = {
  liquidacionCompra: {
    "@id": string;
    "@version": string;
    infoTributaria: TaxInfo;
    infoLiquidacionCompra: PurchaseLiquidationInfo;
    detalles: Details;
    reembolsos?: Reimbursements;
    retenciones?: Retentions;
    maquinaFiscal?: {
      marca: string;
      modelo: string;
      serie: string;
    };
    infoAdicional?: AdditionalInfo;
  };
};

export type PurchaseLiquidationInput = {
  infoTributaria: Omit<TaxInfo, "claveAcceso">;
  infoLiquidacionCompra: PurchaseLiquidationInfo;
  detalles: Details;
  reembolsos?: Reimbursements;
  retenciones?: Retentions;
  maquinaFiscal?: {
    marca: string;
    modelo: string;
    serie: string;
  };
  infoAdicional?: AdditionalInfo;
  version?: string;
};

export const purchaseLiquidation: PurchaseLiquidation = {
  liquidacionCompra: {
    "@id": "comprobante",
    "@version": "1.0.0",
    infoTributaria: {
      ...taxInfo,
      codDoc: "03",
    },
    infoLiquidacionCompra: purchaseLiquidationInfo,
    detalles: details,
    reembolsos: reimbursements,
    retenciones: retentions,
    infoAdicional: additionalInfo,
  },
};
