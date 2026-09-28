import { defaultXmlParser } from "../utils/xml";

export type SoapRequestOptions = {
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  headers?: Record<string, string>;
};

export class SoapFaultError extends Error {
  public faultCode?: string;
  public faultString?: string;
  public detail?: any;

  constructor(message: string, faultCode?: string, faultString?: string, detail?: any) {
    super(message);
    this.name = "SoapFaultError";
    this.faultCode = faultCode;
    this.faultString = faultString;
    this.detail = detail;
  }
}

/**
 * Normaliza la URL del servicio web del SRI eliminando el query string (?wsdl) si está presente.
 */
export function normalizeSriUrl(url: string): string {
  return url.replace(/\?wsdl$/i, "").trim();
}

/**
 * Envía una petición SOAP 1.1 utilizando el fetch nativo de Node.js (o un cliente inyectado)
 * y analiza la respuesta con fast-xml-parser.
 */
export async function sendSoapRequest<T = any>(
  endpointUrl: string,
  soapAction: string,
  soapBodyContent: string,
  options?: SoapRequestOptions
): Promise<T> {
  const url = normalizeSriUrl(endpointUrl);
  const fetchFn = options?.fetchFn ?? globalThis.fetch;

  if (typeof fetchFn !== "function") {
    throw new Error(
      "Fetch API no disponible. Utilice Node.js 20+ o inyecte una función fetch en las opciones."
    );
  }

  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header/>
  <soapenv:Body>
    ${soapBodyContent}
  </soapenv:Body>
</soapenv:Envelope>`;

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId =
    options?.timeoutMs && controller
      ? setTimeout(() => controller.abort(), options.timeoutMs)
      : null;

  try {
    const response = await fetchFn(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml;charset=utf-8",
        SOAPAction: `"${soapAction}"`,
        ...options?.headers,
      },
      body: envelope,
      signal: controller?.signal,
    });

    const responseText = await response.text();

    const parsed = defaultXmlParser.parse(responseText);
    const envelopeData = parsed?.Envelope ?? parsed;
    const bodyData = envelopeData?.Body ?? envelopeData;

    if (bodyData?.Fault) {
      const fault = bodyData.Fault;
      throw new SoapFaultError(
        `SOAP Fault: ${fault.faultstring ?? "Error desconocido en el servicio SRI"}`,
        fault.faultcode,
        fault.faultstring,
        fault.detail
      );
    }

    return bodyData as T;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
