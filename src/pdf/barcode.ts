import bwipjs from "bwip-js";

/**
 * Genera un código de barras Code128 en formato PNG Buffer para la clave de acceso del SRI.
 */
export async function generateBarcodeBuffer(text: string): Promise<Buffer> {
  const sanitized = String(text || "").replace(/\D/g, "");
  if (!sanitized) {
    throw new Error("El texto para el código de barras no puede estar vacío");
  }

  return await bwipjs.toBuffer({
    bcid: "code128",
    text: sanitized,
    scale: 3,
    height: 10,
    includetext: false,
    textxalign: "center",
  });
}
