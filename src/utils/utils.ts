export type GenerateAccessKey = {
  date: Date | string;
  /*
  FACTURA 01
  LIQUIDACIÓN DE COMPRA DE BIENES Y PRESTACIÓN DE SERVICIOS 03
  NOTA DE CRÉDITO 04
  NOTA DE DÉBITO 05
  GUÍA DE REMISIÓN 06
  COMPROBANTE DE RETENCIÓN 07
  */
  codDoc: "01" | "03" | "04" | "05" | "06" | "07" | string;
  ruc: string;
  environment: "1" | "2";
  establishment: string;
  emissionPoint: string;
  sequential: string;
  numericCode?: string;
  emissionType?: "1" | string;
};

export function parseDateInput(dateInput: Date | string): Date {
  if (dateInput instanceof Date) {
    return dateInput;
  }
  if (typeof dateInput === "string") {
    // Manejo de formato DD/MM/YYYY o DD-MM-YYYY (común en SRI)
    const ddmmyyyyMatch = dateInput.trim().match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (ddmmyyyyMatch) {
      const day = parseInt(ddmmyyyyMatch[1], 10);
      const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
      const year = parseInt(ddmmyyyyMatch[3], 10);
      return new Date(year, month, day);
    }
    // Manejo de formato YYYY-MM-DD
    const yyyymmddMatch = dateInput.trim().match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
    if (yyyymmddMatch) {
      const year = parseInt(yyyymmddMatch[1], 10);
      const month = parseInt(yyyymmddMatch[2], 10) - 1;
      const day = parseInt(yyyymmddMatch[3], 10);
      return new Date(year, month, day);
    }
    return new Date(dateInput);
  }
  return new Date(dateInput);
}

export function generateAccessKey(accessKeyData: GenerateAccessKey): string {
  const d = parseDateInput(accessKeyData.date);
  const formattedDate = formatDateToDDMMYYYY(d);
  const codDoc = accessKeyData.codDoc.padStart(2, "0");
  const ruc = accessKeyData.ruc.padStart(13, "0");
  const environment = accessKeyData.environment;
  const establishment = accessKeyData.establishment.padStart(3, "0");
  const emissionPoint = accessKeyData.emissionPoint.padStart(3, "0");
  const sequential = accessKeyData.sequential.padStart(9, "0");
  const numericCode = accessKeyData.numericCode
    ? accessKeyData.numericCode.padStart(8, "0")
    : generateRandomEightDigitNumber().toString();
  const emissionType = accessKeyData.emissionType ?? "1";

  let accessKey = `${formattedDate}${codDoc}${ruc}${environment}${establishment}${emissionPoint}${sequential}${numericCode}${emissionType}`;
  const verificator = generateVerificatorDigit(accessKey);
  accessKey += verificator;

  return accessKey;
}

export function formatDateToDDMMYYYY(date: Date): string {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  const finalDay = day < 10 ? "0" + day : day.toString();
  const finalMonth = month < 10 ? "0" + month : month.toString();

  return `${finalDay}${finalMonth}${year}`;
}

export function generateRandomEightDigitNumber(): number {
  const min = 10000000;
  const max = 99999999;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Calcula el dígito verificador módulo 11 ponderado (factor 2 al 7) según la especificación del SRI.
 */
export function generateVerificatorDigit(accessKey: string): number {
  let addition = 0;
  let multiple = 7;

  for (let i = 0; i < accessKey.length; i++) {
    addition += parseInt(accessKey.charAt(i), 10) * multiple;
    multiple > 2 ? multiple-- : (multiple = 7);
  }

  let result = 11 - (addition % 11);
  if (result === 10) result = 1;
  if (result === 11) result = 0;

  return result;
}
