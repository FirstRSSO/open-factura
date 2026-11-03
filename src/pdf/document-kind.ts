import { SRI_DOCUMENT_CODES } from "../constants/sri";
import type { NormalizedRideData } from "./types";

/** Título del RIDE según el tipo de comprobante (`codDoc`). */
const RIDE_DOCUMENT_TITLES: Record<string, string> = {
  [SRI_DOCUMENT_CODES.FACTURA]: "FACTURA",
  [SRI_DOCUMENT_CODES.LIQUIDACION_COMPRA]: "LIQUIDACIÓN DE COMPRA",
  [SRI_DOCUMENT_CODES.NOTA_CREDITO]: "NOTA DE CRÉDITO",
  [SRI_DOCUMENT_CODES.NOTA_DEBITO]: "NOTA DE DÉBITO",
};

export function rideDocumentTitle(codDoc: string): string {
  return RIDE_DOCUMENT_TITLES[codDoc] ?? RIDE_DOCUMENT_TITLES[SRI_DOCUMENT_CODES.FACTURA];
}

export function isCreditNote(data: NormalizedRideData): boolean {
  return data.codDoc === SRI_DOCUMENT_CODES.NOTA_CREDITO;
}

/**
 * Datos que la ficha técnica del SRI (Anexo 2) pide junto a los del
 * comprador en una nota: el comprobante que modifica, su fecha y, en la nota
 * de crédito, la razón. Vacío en facturas y liquidaciones.
 */
export function modifiedDocumentRows(data: NormalizedRideData): Array<[string, string]> {
  const modified = data.documentoModificado;
  if (!modified) return [];
  const rows: Array<[string, string]> = [
    ["COMPROBANTE QUE SE MODIFICA", `${modified.tipo} ${modified.numero}`],
    ["FECHA EMISIÓN (COMPROBANTE A MODIFICAR)", modified.fechaEmision],
  ];
  if (data.motivo) rows.push(["RAZÓN DE MODIFICACIÓN", data.motivo]);
  return rows;
}
