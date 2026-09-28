import { sendSoapRequest, SoapRequestOptions } from "./soapClient";

export type ReceptionMessage = {
  identificador: string;
  mensaje: string;
  informacionAdicional?: string;
  tipo: string;
};

export type ReceptionComprobante = {
  claveAcceso: string;
  mensajes?: {
    mensaje: ReceptionMessage | ReceptionMessage[];
  };
};

export type ReceptionResponse = {
  estado: "RECIBIDA" | "DEVUELTA" | string;
  comprobantes?: {
    comprobante: ReceptionComprobante | ReceptionComprobante[];
  };
  [key: string]: unknown;
};

/**
 * Envía el comprobante electrónico firmado al Web Service de Recepción del SRI (SOAP 1.1).
 *
 * @param stringXML El XML firmado del comprobante electrónico.
 * @param receptionUrl URL del Web Service de Recepción del SRI (e.g. SRI_ENDPOINTS.test.reception).
 * @param options Opciones adicionales como timeout o inyección de fetch.
 */
export async function documentReception(
  stringXML: string,
  receptionUrl: string,
  options?: SoapRequestOptions
): Promise<ReceptionResponse> {
  const base64XML = Buffer.from(stringXML, "utf8").toString("base64");
  const soapBody = `<ec:validarComprobante xmlns:ec="http://ec.gob.sri.ws.recepcion">
    <xml>${base64XML}</xml>
  </ec:validarComprobante>`;

  const bodyData = await sendSoapRequest<{
    validarComprobanteResponse?: {
      RespuestaRecepcionComprobante?: ReceptionResponse;
    };
    RespuestaRecepcionComprobante?: ReceptionResponse;
  }>(receptionUrl, "", soapBody, options);

  const result =
    bodyData?.validarComprobanteResponse?.RespuestaRecepcionComprobante ??
    bodyData?.RespuestaRecepcionComprobante ??
    bodyData;

  return result as ReceptionResponse;
}
