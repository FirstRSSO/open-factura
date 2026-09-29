import type PDFDocument from "pdfkit";
import { Invoice } from "../baseData/invoice/invoice";
import { PurchaseLiquidation } from "../baseData/purchaseLiquidation/purchaseLiquidation";

export type RidePdfTemplate =
  | "standard"
  | "fullmegas"
  | "modern"
  | ((
      doc: PDFKit.PDFDocument,
      data: NormalizedRideData,
      options: RidePdfOptions
    ) => Promise<void> | void);

export interface RidePdfOptions {
  /**
   * Estilo o plantilla a utilizar.
   * - 'fullmegas': Formato idéntico al proyecto Fullmegas (cajas redondeadas, encabezado doble, tabla clásica).
   * - 'standard' / 'modern': Formato moderno, limpio y profesional con acentos de color.
   * - O una función personalizada (doc, data, options) => void.
   * @default 'standard'
   */
  template?: RidePdfTemplate;

  /**
   * Buffer o ruta de archivo de la imagen del logotipo.
   */
  logo?: Buffer | string;

  /**
   * Color primario para acentos en plantillas compatibles (Hexadecimal, ej. '#1A365D').
   * @default '#2563EB'
   */
  primaryColor?: string;

  /**
   * Datos de autorización del SRI (opcionales si el XML ya los incluye o si se emite sin autorizar aún).
   */
  authorization?: {
    numeroAutorizacion?: string;
    fechaAutorizacion?: string;
    ambiente?: "PRUEBAS" | "PRODUCCION" | string;
  };

  /**
   * Opciones adicionales del emisor / empresa.
   */
  companyData?: {
    logoWidth?: number;
    logoHeight?: number;
    contribuyenteEspecial?: string;
    agenteRetencion?: string;
    regimenRimpe?: boolean | string;
    headerText?: string;
    footerText?: string;
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
