import {
  PurchaseLiquidation,
  PurchaseLiquidationInput,
} from "../baseData/purchaseLiquidation/purchaseLiquidation";
import { generateAccessKey } from "../utils/utils";
import { buildXml } from "../utils/xml";

export function generatePurchaseLiquidationXml(
  liquidation: PurchaseLiquidation
): string {
  return buildXml(liquidation as unknown as Record<string, unknown>);
}

export function generatePurchaseLiquidation(
  liquidationData: PurchaseLiquidationInput
): {
  purchaseLiquidation: PurchaseLiquidation;
  accessKey: string;
} {
  const accessKey = generateAccessKey({
    date: liquidationData.infoLiquidacionCompra.fechaEmision,
    codDoc: "03",
    ruc: liquidationData.infoTributaria.ruc,
    environment: liquidationData.infoTributaria.ambiente,
    establishment: liquidationData.infoTributaria.estab,
    emissionPoint: liquidationData.infoTributaria.ptoEmi,
    sequential: liquidationData.infoTributaria.secuencial,
  });

  const purchaseLiquidation: PurchaseLiquidation = {
    liquidacionCompra: {
      "@id": "comprobante",
      "@version": liquidationData.version ?? "1.0.0",
      infoTributaria: {
        ...liquidationData.infoTributaria,
        codDoc: "03",
        claveAcceso: accessKey,
      },
      infoLiquidacionCompra: liquidationData.infoLiquidacionCompra,
      detalles: liquidationData.detalles,
      ...(liquidationData.reembolsos
        ? { reembolsos: liquidationData.reembolsos }
        : {}),
      ...(liquidationData.retenciones
        ? { retenciones: liquidationData.retenciones }
        : {}),
      ...(liquidationData.maquinaFiscal
        ? { maquinaFiscal: liquidationData.maquinaFiscal }
        : {}),
      ...(liquidationData.infoAdicional
        ? { infoAdicional: liquidationData.infoAdicional }
        : {}),
    },
  };

  return { purchaseLiquidation, accessKey };
}
