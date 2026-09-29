import {
  PurchaseLiquidation,
  PurchaseLiquidationInput,
} from "../baseData/purchaseLiquidation/purchaseLiquidation";
import { generateAccessKey } from "../utils/utils";
import { buildXml } from "../utils/xml";
import {
  orderPurchaseLiquidation,
  orderInfoTributaria,
} from "../utils/sriOrder";

export function generatePurchaseLiquidationXml(
  liquidation: PurchaseLiquidation
): string {
  const orderedLiquidation = orderPurchaseLiquidation(liquidation);
  return buildXml(orderedLiquidation as unknown as Record<string, unknown>);
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

  const rawPurchaseLiquidation: PurchaseLiquidation = {
    liquidacionCompra: {
      "@id": "comprobante",
      "@version": liquidationData.version ?? "1.0.0",
      infoTributaria: orderInfoTributaria({
        ...liquidationData.infoTributaria,
        codDoc: "03",
        claveAcceso: accessKey,
      } as any),
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

  const purchaseLiquidation = orderPurchaseLiquidation(rawPurchaseLiquidation);
  return { purchaseLiquidation, accessKey };
}
