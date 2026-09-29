import PDFDocument from "pdfkit";
import { Invoice } from "../baseData/invoice/invoice";
import { PurchaseLiquidation } from "../baseData/purchaseLiquidation/purchaseLiquidation";
import { RidePdfOptions } from "./types";
import { normalizeRideData } from "./normalizer";
import { renderFullmegasTemplate } from "./templates/fullmegas";
import { renderStandardTemplate } from "./templates/standard";

/**
 * Genera el documento RIDE en formato PDF (Buffer) a partir de una Factura,
 * Liquidación de Compra, o un XML firmado/autorizado del SRI.
 *
 * @param document Objeto Invoice, PurchaseLiquidation o XML string del comprobante.
 * @param options Opciones de configuración, incluyendo la selección de plantilla ('fullmegas' | 'standard' | función personalizada).
 * @returns Buffer con el contenido binario del PDF.
 */
export async function generateRidePdf(
  document: Invoice | PurchaseLiquidation | string | Record<string, unknown>,
  options?: RidePdfOptions
): Promise<Buffer> {
  const normalizedData = normalizeRideData(document, options);
  const templateChoice = options?.template || "standard";

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 20,
        info: {
          Title: `RIDE - ${normalizedData.numeroComprobante}`,
          Author: normalizedData.emisor.razonSocial || "open-factura-ec",
          Subject: `${normalizedData.tipoComprobante} Electrónica`,
          Keywords: `SRI, RIDE, ${normalizedData.claveAcceso}`,
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      const runTemplate = async () => {
        if (typeof templateChoice === "function") {
          await templateChoice(doc, normalizedData, options || {});
        } else if (templateChoice === "fullmegas") {
          await renderFullmegasTemplate(doc, normalizedData, options || {});
        } else {
          // 'standard' o 'modern'
          await renderStandardTemplate(doc, normalizedData, options || {});
        }
      };

      runTemplate()
        .then(() => doc.end())
        .catch((err) => {
          doc.end();
          reject(err);
        });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Genera el documento RIDE en formato Base64 directamente (útil para APIs JSON y respuestas HTTP).
 */
export async function generateRidePdfBase64(
  document: Invoice | PurchaseLiquidation | string | Record<string, unknown>,
  options?: RidePdfOptions
): Promise<string> {
  const buffer = await generateRidePdf(document, options);
  return buffer.toString("base64");
}
