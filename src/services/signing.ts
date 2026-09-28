import { readFileSync } from "fs";
import {
  signInvoiceXml as ecSignInvoiceXml,
  signDebitNoteXml as ecSignDebitNoteXml,
  signCreditNoteXml as ecSignCreditNoteXml,
  signDeliveryGuideXml as ecSignDeliveryGuideXml,
  signWithholdingCertificateXml as ecSignWithholdingCertificateXml,
  XmlFormatError,
  UnsuportedPkcs12Error,
  UnsupportedXmlFeatureError,
  UnsupportedDocumentTypeError,
} from "ec-sri-invoice-signer";
// @ts-ignore - internal export for liquidacionCompra support
import { signDocumentXml as ecSignDocumentXml } from "ec-sri-invoice-signer/dist/src/signature/signature.js";

export type SignXmlOptions = {
  pkcs12Password?: string;
};

export {
  XmlFormatError,
  UnsuportedPkcs12Error,
  UnsupportedXmlFeatureError,
  UnsupportedDocumentTypeError,
};

/**
 * Normaliza los datos del certificado PKCS#12 a Buffer o string base64.
 */
export function normalizeP12(
  p12Data: ArrayBuffer | Buffer | Uint8Array | string
): Buffer | string {
  if (typeof p12Data === "string") {
    return p12Data;
  }
  if (Buffer.isBuffer(p12Data)) {
    return p12Data;
  }
  if (p12Data instanceof ArrayBuffer) {
    return Buffer.from(p12Data);
  }
  if (ArrayBuffer.isView(p12Data)) {
    return Buffer.from(p12Data.buffer, p12Data.byteOffset, p12Data.byteLength);
  }
  return Buffer.from(p12Data as any);
}

/**
 * Limpia namespaces incompatibles (xmlns:ds, xmlns:xsi) del nodo raíz si fueron agregados previamente.
 */
function sanitizeXmlForSigner(xml: string): string {
  return xml
    .replace(/\s*xmlns:ds="[^"]*"/g, "")
    .replace(/\s*xmlns:xsi="[^"]*"/g, "");
}

/**
 * Carga un archivo .p12 o .pfx desde el sistema de archivos local.
 */
export function getP12FromLocalFile(path: string): Buffer {
  return readFileSync(path);
}

/**
 * Descarga un archivo .p12 o .pfx desde una URL utilizando el fetch nativo de Node.js.
 */
export async function getP12FromUrl(
  url: string,
  fetchFn: typeof fetch = fetch
): Promise<Buffer> {
  const response = await fetchFn(url);
  if (!response.ok) {
    throw new Error(
      `Error al descargar certificado P12: ${response.status} ${response.statusText}`
    );
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Lee un archivo XML local como cadena de texto en codificación UTF-8.
 */
export function getXMLFromLocalFile(path: string): string {
  return readFileSync(path, "utf8");
}

/**
 * Descarga un XML desde una URL utilizando fetch nativo.
 */
export async function getXMLFromLocalUrl(
  url: string,
  fetchFn: typeof fetch = fetch
): Promise<string> {
  const response = await fetchFn(url);
  if (!response.ok) {
    throw new Error(
      `Error al descargar XML: ${response.status} ${response.statusText}`
    );
  }
  return await response.text();
}

/**
 * Firma una Liquidación de Compra XML utilizando ec-sri-invoice-signer.
 */
export function signPurchaseLiquidationXml(
  xml: string,
  pkcs12Data: ArrayBuffer | Buffer | Uint8Array | string,
  options?: SignXmlOptions
): string {
  const p12 = normalizeP12(pkcs12Data);
  const sanitized = sanitizeXmlForSigner(xml);
  return ecSignDocumentXml(sanitized, p12, "liquidacionCompra", options);
}

/**
 * Firma una Factura XML utilizando ec-sri-invoice-signer.
 */
export function signInvoiceXml(
  xml: string,
  pkcs12Data: ArrayBuffer | Buffer | Uint8Array | string,
  options?: SignXmlOptions
): string {
  const p12 = normalizeP12(pkcs12Data);
  const sanitized = sanitizeXmlForSigner(xml);
  return ecSignInvoiceXml(sanitized, p12, options);
}

/**
 * Firma una Nota de Débito XML.
 */
export function signDebitNoteXml(
  xml: string,
  pkcs12Data: ArrayBuffer | Buffer | Uint8Array | string,
  options?: SignXmlOptions
): string {
  const p12 = normalizeP12(pkcs12Data);
  const sanitized = sanitizeXmlForSigner(xml);
  return ecSignDebitNoteXml(sanitized, p12, options);
}

/**
 * Firma una Nota de Crédito XML.
 */
export function signCreditNoteXml(
  xml: string,
  pkcs12Data: ArrayBuffer | Buffer | Uint8Array | string,
  options?: SignXmlOptions
): string {
  const p12 = normalizeP12(pkcs12Data);
  const sanitized = sanitizeXmlForSigner(xml);
  return ecSignCreditNoteXml(sanitized, p12, options);
}

/**
 * Firma una Guía de Remisión XML.
 */
export function signDeliveryGuideXml(
  xml: string,
  pkcs12Data: ArrayBuffer | Buffer | Uint8Array | string,
  options?: SignXmlOptions
): string {
  const p12 = normalizeP12(pkcs12Data);
  const sanitized = sanitizeXmlForSigner(xml);
  return ecSignDeliveryGuideXml(sanitized, p12, options);
}

/**
 * Firma un Comprobante de Retención XML.
 */
export function signWithholdingCertificateXml(
  xml: string,
  pkcs12Data: ArrayBuffer | Buffer | Uint8Array | string,
  options?: SignXmlOptions
): string {
  const p12 = normalizeP12(pkcs12Data);
  const sanitized = sanitizeXmlForSigner(xml);
  return ecSignWithholdingCertificateXml(sanitized, p12, options);
}

/**
 * Función principal y retrocompatible de firmado digital XAdES-BES.
 * Detecta automáticamente el tipo de documento del comprobante.
 */
export async function signXml(
  p12Data: ArrayBuffer | Buffer | Uint8Array | string,
  p12Password: string,
  xmlData: string
): Promise<string> {
  const p12 = normalizeP12(p12Data);
  const sanitizedXml = sanitizeXmlForSigner(xmlData);

  // Detectar la etiqueta raíz del documento XML (e.g. factura, liquidacionCompra, etc.)
  const match = sanitizedXml.match(/<([a-zA-Z0-9]+)[\s>]/);
  const rootTag = match ? match[1] : "factura";
  const options: SignXmlOptions = { pkcs12Password: p12Password };

  switch (rootTag) {
    case "factura":
      return ecSignInvoiceXml(sanitizedXml, p12, options);
    case "liquidacionCompra":
      return ecSignDocumentXml(sanitizedXml, p12, "liquidacionCompra", options);
    case "notaDebito":
      return ecSignDebitNoteXml(sanitizedXml, p12, options);
    case "notaCredito":
      return ecSignCreditNoteXml(sanitizedXml, p12, options);
    case "guiaRemision":
      return ecSignDeliveryGuideXml(sanitizedXml, p12, options);
    case "comprobanteRetencion":
      return ecSignWithholdingCertificateXml(sanitizedXml, p12, options);
    default:
      return ecSignDocumentXml(sanitizedXml, p12, rootTag, options);
  }
}
