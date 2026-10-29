import type PDFDocument from "pdfkit";
import { Invoice } from "../baseData/invoice/invoice";
import { PurchaseLiquidation } from "../baseData/purchaseLiquidation/purchaseLiquidation";

export type RidePdfTemplate =
  | "standard"
  | "alternative"
  | "alternativo"
  | "modern"
  | "fullmegas"
  | ((
      doc: PDFKit.PDFDocument,
      data: NormalizedRideData,
      options: RidePdfOptions
    ) => Promise<RideTemplateLayout | void> | RideTemplateLayout | void);

/**
 * Dónde quedó el bloque final (información adicional, pagos y totales) tras
 * dibujar la plantilla. Sirve a quien pinta encima del RIDE para mover sus
 * elementos con ese bloque cuando el detalle lo empuja hacia abajo.
 */
export interface RideTemplateLayout {
  finalBlock: {
    /** Índice absoluto de la hoja (0 = primera). */
    pageIndex: number;
    /** Altura (pt desde arriba) a la que arranca el bloque. */
    top: number;
    /**
     * Columnas del bloque (p. ej. información adicional y pagos a la
     * izquierda, totales a la derecha) con su alto desde `top`.
     */
    columns: RideFinalBlockColumn[];
  };
}

export interface RideFinalBlockColumn {
  x: number;
  width: number;
  height: number;
}

/**
 * Espacio que el llamador necesita debajo de las columnas del bloque final
 * que solapan con `[x, x + width]`, contado desde el final de la más alta.
 */
export interface RideFinalBlockReserve {
  x: number;
  width: number;
  height: number;
}

export interface RidePdfOptions {
  /**
   * Estilo o plantilla a utilizar.
   * - 'standard' / 'modern': Formato moderno con banner de acento y diseño limpio institucional (por defecto).
   * - 'alternative' / 'alternativo': Formato alternativo (cajas redondeadas con radio 10, encabezado azul '#0d6efd', datos de cliente en dos columnas, tabla sin bordes internos y caja de totales con división 60/40).
   * - O una función personalizada (doc, data, options) => void.
   * @default 'standard' (configurable globalmente vía setDefaultRideTemplate)
   */
  template?: RidePdfTemplate;

  /**
   * Buffer o ruta de archivo de la imagen del logotipo.
   */
  logo?: Buffer | string;

  /**
   * Color primario para acentos en plantillas compatibles (Hexadecimal, ej. '#0d6efd' en alternative o '#1E3A8A' en standard).
   * @default '#0d6efd' para alternative, '#1E3A8A' para standard
   */
  primaryColor?: string;

  /**
   * Alto mínimo (pt) que necesita el bloque final desde su borde superior.
   * Si el llamador pinta elementos propios debajo de la tabla, con esto el
   * bloque pasa a una hoja nueva cuando esos elementos no cabrían.
   */
  finalBlockMinHeight?: number;

  /**
   * Como `finalBlockMinHeight`, pero medido desde el final de las columnas
   * que quedan encima: para elementos que van pegados bajo una columna.
   */
  finalBlockReserves?: RideFinalBlockReserve[];

  /**
   * Datos de autorización del SRI (opcionales si el XML ya los incluye o si se emite sin autorizar aún).
   */
  authorization?: {
    numeroAutorizacion?: string;
    fechaAutorizacion?: string;
    ambiente?: "PRUEBAS" | "PRODUCCION" | string;
  };

  /**
   * Opciones adicionales del emisor / empresa (compatibles con Fullmegas y personalización avanzada).
   */
  companyData?: {
    logoWidth?: number;
    logoHeight?: number;
    contribuyenteEspecial?: string;
    agenteRetencion?: string;
    agenteRetencionResolucion?: string;
    regimenRimpe?: boolean | string;
    headerText?: string;
    infoText?: string;
    termsText?: string;
    footerText?: string;
    showDueDate?: boolean;
    showRemissionGuide?: boolean;
    invoicePdfTemplate?: any;
  };
}

export interface NormalizedItem {
  code: string;
  auxCode?: string;
  description: string;
  quantity: number | string;
  unitPrice: number | string;
  discount: number | string;
  total: number | string;
}

export interface NormalizedTaxTotal {
  codigo: string;
  codigoPorcentaje: string;
  tarifa?: string;
  baseImponible: string;
  valor: string;
  label?: string;
}

export interface NormalizedRideData {
  tipoComprobante: string;
  codDoc: string;
  numeroComprobante: string;
  claveAcceso: string;
  ambiente: string;
  tipoEmision: string;
  numeroAutorizacion: string;
  fechaAutorizacion: string;

  emisor: {
    razonSocial: string;
    nombreComercial?: string;
    ruc: string;
    dirMatriz: string;
    dirEstablecimiento?: string;
    obligadoContabilidad: string;
    contribuyenteEspecial?: string;
    agenteRetencion?: string;
    contribuyenteRimpe?: string;
  };

  comprador: {
    razonSocial: string;
    identificacion: string;
    tipoIdentificacion: string;
    direccion?: string;
    fechaEmision: string;
    guiaRemision?: string;
  };

  items: NormalizedItem[];

  totales: {
    subtotalSinImpuestos: string;
    totalDescuento: string;
    impuestos: NormalizedTaxTotal[];
    propina: string;
    importeTotal: string;
    moneda: string;
  };

  pagos: Array<{
    formaPago: string;
    total: string;
    plazo?: string;
    unidadTiempo?: string;
  }>;

  infoAdicional: Array<{
    nombre: string;
    valor: string;
  }>;
}
