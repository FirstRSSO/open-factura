// Web Services SRI (SOAP 1.1)
export {
  documentAuthorization,
  AuthorizationResponse,
  Autorizacion,
  AuthorizationMessage,
} from "./services/authorization";
export {
  documentReception,
  ReceptionResponse,
  ReceptionComprobante,
  ReceptionMessage,
} from "./services/reception";
export {
  sendSoapRequest,
  SoapRequestOptions,
  SoapFaultError,
  normalizeSriUrl,
} from "./services/soapClient";

// Generación de Comprobantes XML
export {
  generateInvoice,
  generateInvoiceXml,
} from "./services/generateInvoice";
export {
  generatePurchaseLiquidation,
  generatePurchaseLiquidationXml,
} from "./services/generatePurchaseLiquidation";

// Firma Electrónica XAdES-BES (ec-sri-invoice-signer)
export {
  signXml,
  signInvoiceXml,
  signPurchaseLiquidationXml,
  signDebitNoteXml,
  signCreditNoteXml,
  signDeliveryGuideXml,
  signWithholdingCertificateXml,
  normalizeP12,
  getP12FromLocalFile,
  getP12FromUrl,
  getXMLFromLocalFile,
  getXMLFromLocalUrl,
  XmlFormatError,
  UnsuportedPkcs12Error,
  UnsupportedXmlFeatureError,
  UnsupportedDocumentTypeError,
  SignXmlOptions,
} from "./services/signing";

// Estructuras de Datos: Factura
export {
  AdditionalInfo,
  AdditionalField,
  additionalInfo,
} from "./baseData/invoice/additionalInfo";
export {
  Details,
  Detail,
  Taxes,
  Tax,
  AdditionalDetails,
  AdditionalDetail,
  details,
} from "./baseData/invoice/details";
export { InvoiceInput, Invoice, invoice } from "./baseData/invoice/invoice";
export {
  InvoiceInfo,
  TotalWithTax,
  TotalWithTaxes,
  Compensation,
  Compensations,
  Payment,
  Payments,
  invoiceInfo,
} from "./baseData/invoice/invoiceInfo";
export {
  ThirdPartyValue,
  OtherThirdPartyValues,
  otherThirdPartyValues,
} from "./baseData/invoice/otherThirdPartyValues";
export {
  Reimbursements,
  ReimbursementDetail,
  ReimbursementCompensations,
  ReimbursementCompensation,
  TaxDetails,
  TaxDetail,
  reimbursements,
} from "./baseData/invoice/reimbursements";
export {
  RemisionGuideSustitutiveInfo,
  Arrivals,
  Arrival,
  remisionGuideSustitutiveInfo,
} from "./baseData/invoice/remissionGuidesSustitutiveInfo";
export {
  Retentions,
  Retention,
  retentions,
} from "./baseData/invoice/retentions";
export {
  TaxInfo,
  ContribuyenteRimpe,
  taxInfo,
} from "./baseData/invoice/taxInfo";

// Estructuras de Datos: Liquidación de Compra
export {
  PurchaseLiquidation,
  PurchaseLiquidationInput,
  purchaseLiquidation,
} from "./baseData/purchaseLiquidation/purchaseLiquidation";
export {
  PurchaseLiquidationInfo,
  purchaseLiquidationInfo,
} from "./baseData/purchaseLiquidation/purchaseLiquidationInfo";

// Utilidades XML
export {
  buildXml,
  parseXml,
  defaultXmlBuilder,
  defaultXmlParser,
} from "./utils/xml";

// Utilidades Generales
export {
  generateAccessKey,
  generateVerificatorDigit,
  formatDateToDDMMYYYY,
  GenerateAccessKey,
} from "./utils/utils";

// Constantes Oficiales SRI
export {
  SRI_ENDPOINTS,
  SRI_DOCUMENT_CODES,
  SRI_TAX_CODES,
  SRI_IVA_PERCENTAGES,
  SRI_RIMPE_LEGENDS,
} from "./constants/sri";
