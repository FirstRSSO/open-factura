import { XMLBuilder, XMLParser } from "fast-xml-parser";

export const defaultXmlBuilder = new XMLBuilder({
  attributeNamePrefix: "@",
  textNodeName: "#",
  ignoreAttributes: false,
  format: true,
  indentBy: "  ",
  suppressEmptyNode: false,
});

export const defaultXmlParser = new XMLParser({
  attributeNamePrefix: "@",
  textNodeName: "#",
  ignoreAttributes: false,
  parseTagValue: false, // Preserva ceros a la izquierda en RUC, secuencial, códigos, etc.
  parseAttributeValue: false,
  trimValues: true,
  removeNSPrefix: true, // Elimina prefijos como soap:Body -> Body, ec:validarComprobante -> validarComprobante
});

export function buildXml(
  document: Record<string, unknown>,
  xmlDeclaration = true
): string {
  const xmlBody = defaultXmlBuilder.build(document);
  return xmlDeclaration ? `<?xml version="1.0" encoding="UTF-8"?>\n${xmlBody}` : xmlBody;
}

export function parseXml<T = any>(xml: string): T {
  return defaultXmlParser.parse(xml) as T;
}
