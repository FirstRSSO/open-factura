import { sendSoapRequest, SoapRequestOptions } from "./soapClient";

export type AuthorizationMessage = {
  identificador: string;
  mensaje: string;
  informacionAdicional?: string;
  tipo: string;
};

export type Autorizacion = {
  estado: "AUTORIZADO" | "NO AUTORIZADO" | string;
  numeroAutorizacion?: string;
  fechaAutorizacion?: string;
  ambiente?: string;
  comprobante?: string;
  mensajes?: {
    mensaje: AuthorizationMessage | AuthorizationMessage[];
  };
};

export type AuthorizationResponse = {
  claveAccesoConsultada?: string;
  numeroComprobantes?: string;
  autorizaciones?: {
    autorizacion: Autorizacion | Autorizacion[];
  };
  [key: string]: unknown;
};

/**
 * Consulta la autorización de un comprobante electrónico en el Web Service del SRI (SOAP 1.1).
 *
 * @param accessKey Clave de acceso de 49 dígitos del comprobante.
 * @param authorizationUrl URL del Web Service de Autorización del SRI.
 * @param options Opciones adicionales como timeout o inyección de fetch.
 */
export async function documentAuthorization(
  accessKey: string,
  authorizationUrl: string,
  options?: SoapRequestOptions
): Promise<AuthorizationResponse> {
  const soapBody = `<ec:autorizacionComprobante xmlns:ec="http://ec.gob.sri.ws.autorizacion">
    <claveAccesoComprobante>${accessKey}</claveAccesoComprobante>
  </ec:autorizacionComprobante>`;

  const bodyData = await sendSoapRequest<{
    autorizacionComprobanteResponse?: {
      RespuestaAutorizacionComprobante?: AuthorizationResponse;
    };
    RespuestaAutorizacionComprobante?: AuthorizationResponse;
  }>(authorizationUrl, "", soapBody, options);

  const result =
    bodyData?.autorizacionComprobanteResponse?.RespuestaAutorizacionComprobante ??
    bodyData?.RespuestaAutorizacionComprobante ??
    bodyData;

  return result as AuthorizationResponse;
}
