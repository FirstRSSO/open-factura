import { test, describe } from "node:test";
import assert from "node:assert/strict";
import forge from "node-forge";
import { createRequire } from "node:module";

import {
  generateAccessKey,
  generateVerificatorDigit,
  formatDateToDDMMYYYY,
  generateInvoice,
  generateInvoiceXml,
  generatePurchaseLiquidation,
  generatePurchaseLiquidationXml,
  signXml,
  signInvoiceXml,
  signPurchaseLiquidationXml,
  normalizeP12,
  documentReception,
  documentAuthorization,
  sendSoapRequest,
  SoapFaultError,
  SRI_ENDPOINTS,
  SRI_DOCUMENT_CODES,
  SRI_TAX_CODES,
  SRI_IVA_PERCENTAGES,
  SRI_RIMPE_LEGENDS,
} from "../dist/index.mjs";

const require = createRequire(import.meta.url);
const cjs = require("../dist/index.cjs");

// Generador de certificado P12 en memoria para pruebas criptográficas
function generateTestP12(password = "testPassword123") {
  const pki = forge.pki;
  const keys = pki.rsa.generateKeyPair(2048);
  const cert = pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  const attrs = [
    { name: "commonName", value: "PRUEBA TECNICA SRI" },
    { name: "countryName", value: "EC" },
    { name: "organizationName", value: "SRI TEST" },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey);

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password);
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  return Buffer.from(p12Der, "binary");
}

describe("1. Clave de Acceso y Dígito Verificador SRI", () => {
  test("Cálculo del dígito verificador módulo 11 ponderado", () => {
    // Ejemplo real de clave SRI parcial de 48 dígitos
    const sample48 = "280920260117900123450011001001000000001123456781";
    const digit = generateVerificatorDigit(sample48);
    assert.strictEqual(typeof digit, "number");
    assert.ok(digit >= 0 && digit <= 9);
  });

  test("Generación de Clave de Acceso completa de 49 dígitos", () => {
    const key = generateAccessKey({
      date: new Date(2026, 8, 28), // 28/09/2026
      codDoc: "01",
      ruc: "1790012345001",
      environment: "1",
      establishment: "001",
      emissionPoint: "001",
      sequential: "000000001",
      numericCode: "12345678",
      emissionType: "1",
    });

    assert.strictEqual(key.length, 49);
    assert.ok(key.startsWith("280920260117900123450011001001000000001123456781"));
  });

  test("Formato de fecha DDMMYYYY", () => {
    const formatted = formatDateToDDMMYYYY(new Date(2026, 0, 5)); // 05/01/2026
    assert.strictEqual(formatted, "05012026");
  });
});

describe("2. Generación de Factura (IVA 15% y Régimen RIMPE)", () => {
  test("Estructura de factura con IVA 15% (código 4) y RIMPE", () => {
    const { invoice, accessKey } = generateInvoice({
      infoTributaria: {
        ambiente: "1",
        tipoEmision: "1",
        razonSocial: "EMPRESA DE PRUEBA S.A.",
        nombreComercial: "MI NEGOCIO",
        ruc: "1790012345001",
        codDoc: "01",
        estab: "001",
        ptoEmi: "002",
        secuencial: "000000123",
        dirMatriz: "Av. Amazonas y Colón",
        contribuyenteRimpe: SRI_RIMPE_LEGENDS.EMPRENDEDOR,
      },
      infoFactura: {
        fechaEmision: "28/09/2026",
        dirEstablecimiento: "Av. Principal 123",
        obligadoContabilidad: "NO",
        tipoIdentificacionComprador: "05",
        razonSocialComprador: "JUAN PEREZ",
        identificacionComprador: "1712345678",
        totalSinImpuestos: "100.00",
        totalDescuento: "0.00",
        totalConImpuestos: {
          totalImpuesto: [
            {
              codigo: SRI_TAX_CODES.IVA,
              codigoPorcentaje: SRI_IVA_PERCENTAGES.IVA_15, // Código 4 (15%)
              baseImponible: "100.00",
              tarifa: "15.00",
              valor: "15.00",
            },
          ],
        },
        importeTotal: "115.00",
        pagos: {
          pago: [
            {
              formaPago: "01",
              total: "115.00",
            },
          ],
        },
      },
      detalles: {
        detalle: [
          {
            codigoPrincipal: "PROD001",
            descripcion: "Servicio de Consultoría de Software",
            cantidad: "1.000000",
            precioUnitario: "100.000000",
            descuento: "0.00",
            precioTotalSinImpuesto: "100.00",
            impuestos: {
              impuesto: [
                {
                  codigo: SRI_TAX_CODES.IVA,
                  codigoPorcentaje: SRI_IVA_PERCENTAGES.IVA_15,
                  tarifa: "15.00",
                  baseImponible: "100.00",
                  valor: "15.00",
                },
              ],
            },
          },
        ],
      },
    });

    assert.strictEqual(accessKey.length, 49);
    assert.strictEqual(invoice.factura["@id"], "comprobante");
    assert.strictEqual(invoice.factura["@version"], "1.0.0");
    assert.strictEqual(invoice.factura.infoTributaria.contribuyenteRimpe, "CONTRIBUYENTE RÉGIMEN RIMPE");
    assert.strictEqual(invoice.factura.infoFactura.totalConImpuestos.totalImpuesto[0].codigoPorcentaje, "4");

    const xml = generateInvoiceXml(invoice);
    assert.ok(xml.startsWith("<?xml version=\"1.0\" encoding=\"UTF-8\"?>"));
    assert.ok(xml.includes("<factura id=\"comprobante\" version=\"1.0.0\">"));
    // Verificar que NO incluya namespaces en el nodo raíz (incompatible con ec-sri-invoice-signer)
    assert.ok(!xml.includes("xmlns:ds="));
    assert.ok(!xml.includes("xmlns:xsi="));
    assert.ok(xml.includes("<contribuyenteRimpe>CONTRIBUYENTE RÉGIMEN RIMPE</contribuyenteRimpe>"));
    assert.ok(xml.includes("<codigoPorcentaje>4</codigoPorcentaje>"));
  });
});

describe("3. Generación de Liquidación de Compra (codDoc 03)", () => {
  test("Estructura de liquidacionCompra", () => {
    const { purchaseLiquidation, accessKey } = generatePurchaseLiquidation({
      infoTributaria: {
        ambiente: "1",
        tipoEmision: "1",
        razonSocial: "EMPRESA COMPRADORA S.A.",
        ruc: "1790012345001",
        estab: "001",
        ptoEmi: "001",
        secuencial: "000000050",
        dirMatriz: "Quito, Ecuador",
      },
      infoLiquidacionCompra: {
        fechaEmision: "28/09/2026",
        dirEstablecimiento: "Sucursal Norte",
        obligadoContabilidad: "SI",
        tipoIdentificacionProveedor: "05",
        razonSocialProveedor: "CARLOS ARTESANO",
        identificacionProveedor: "1723456789",
        direccionProveedor: "Otavalo, Ecuador",
        totalSinImpuestos: "200.00",
        totalDescuento: "0.00",
        totalConImpuestos: {
          totalImpuesto: [
            {
              codigo: "2",
              codigoPorcentaje: "4",
              baseImponible: "200.00",
              tarifa: "15.00",
              valor: "30.00",
            },
          ],
        },
        importeTotal: "230.00",
        pagos: {
          pago: [
            {
              formaPago: "01",
              total: "230.00",
            },
          ],
        },
      },
      detalles: {
        detalle: [
          {
            codigoPrincipal: "ART01",
            descripcion: "Mueble de Madera Rústico",
            cantidad: "1.000000",
            precioUnitario: "200.000000",
            descuento: "0.00",
            precioTotalSinImpuesto: "200.00",
            impuestos: {
              impuesto: [
                {
                  codigo: "2",
                  codigoPorcentaje: "4",
                  tarifa: "15.00",
                  baseImponible: "200.00",
                  valor: "30.00",
                },
              ],
            },
          },
        ],
      },
    });

    assert.strictEqual(accessKey.length, 49);
    assert.strictEqual(purchaseLiquidation.liquidacionCompra.infoTributaria.codDoc, "03");
    assert.strictEqual(purchaseLiquidation.liquidacionCompra["@id"], "comprobante");

    const xml = generatePurchaseLiquidationXml(purchaseLiquidation);
    assert.ok(xml.includes("<liquidacionCompra id=\"comprobante\" version=\"1.0.0\">"));
    assert.ok(xml.includes("<infoLiquidacionCompra>"));
    assert.ok(xml.includes("<tipoIdentificacionProveedor>05</tipoIdentificacionProveedor>"));
    assert.ok(xml.includes("<razonSocialProveedor>CARLOS ARTESANO</razonSocialProveedor>"));
    assert.ok(!xml.includes("xmlns:ds="));
  });
});

describe("4. Firmado Electrónico XAdES-BES con ec-sri-invoice-signer", () => {
  const p12Buffer = generateTestP12("miClaveSegura123");

  test("Firma de Factura con signXml (Buffer)", async () => {
    const rawXml = "<factura id=\"comprobante\" version=\"1.0.0\"><infoTributaria><ruc>1790012345001</ruc></infoTributaria></factura>";
    const signedXml = await signXml(p12Buffer, "miClaveSegura123", rawXml);

    assert.ok(signedXml.includes("<ds:Signature"));
    assert.ok(signedXml.includes("URI=\"#comprobante\""));
    assert.ok(signedXml.includes("SignedProperties"));
    assert.ok(signedXml.includes("</factura>"));
  });

  test("Firma de Factura con signXml pasando ArrayBuffer (retrocompatibilidad)", async () => {
    const rawXml = "<factura id=\"comprobante\" version=\"1.0.0\"><infoTributaria><ruc>1790012345001</ruc></infoTributaria></factura>";
    const arrayBuffer = p12Buffer.buffer.slice(
      p12Buffer.byteOffset,
      p12Buffer.byteOffset + p12Buffer.byteLength
    );
    const signedXml = await signXml(arrayBuffer, "miClaveSegura123", rawXml);

    assert.ok(signedXml.includes("<ds:Signature"));
    assert.ok(signedXml.includes("URI=\"#comprobante\""));
  });

  test("Firma de Factura con signXml pasando base64 string", async () => {
    const rawXml = "<factura id=\"comprobante\" version=\"1.0.0\"><infoTributaria><ruc>1790012345001</ruc></infoTributaria></factura>";
    const base64 = p12Buffer.toString("base64");
    const signedXml = await signXml(base64, "miClaveSegura123", rawXml);

    assert.ok(signedXml.includes("<ds:Signature"));
    assert.ok(signedXml.includes("URI=\"#comprobante\""));
  });

  test("Firma de Liquidación de Compra con signPurchaseLiquidationXml", () => {
    const rawXml = "<liquidacionCompra id=\"comprobante\" version=\"1.0.0\"><infoTributaria><ruc>1790012345001</ruc></infoTributaria></liquidacionCompra>";
    const signedXml = signPurchaseLiquidationXml(rawXml, p12Buffer, {
      pkcs12Password: "miClaveSegura123",
    });

    assert.ok(signedXml.includes("<ds:Signature"));
    assert.ok(signedXml.includes("URI=\"#comprobante\""));
    assert.ok(signedXml.includes("</liquidacionCompra>"));
  });

  test("Sanitización automática de namespaces residuales si caller envía xmlns en raíz", async () => {
    const legacyXml = "<factura xmlns:ds=\"http://www.w3.org/2000/09/xmldsig#\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" id=\"comprobante\" version=\"1.0.0\"><infoTributaria><ruc>1790012345001</ruc></infoTributaria></factura>";
    // No debe lanzar UnsupportedXmlFeatureError
    const signedXml = await signXml(p12Buffer, "miClaveSegura123", legacyXml);
    assert.ok(signedXml.includes("<ds:Signature"));
  });
});

describe("5. Cliente SOAP 1.1 Ligero (sin paquete soap, fetch nativo)", () => {
  test("Llamada mock a Recepción Comprobantes", async () => {
    const mockXmlResponse = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <ns2:validarComprobanteResponse xmlns:ns2="http://ec.gob.sri.ws.recepcion">
      <RespuestaRecepcionComprobante>
        <estado>RECIBIDA</estado>
        <comprobantes/>
      </RespuestaRecepcionComprobante>
    </ns2:validarComprobanteResponse>
  </soap:Body>
</soap:Envelope>`;

    let capturedUrl = "";
    let capturedBody = "";
    const mockFetch = async (url, init) => {
      capturedUrl = url.toString();
      capturedBody = init.body.toString();
      return {
        ok: true,
        status: 200,
        text: async () => mockXmlResponse,
      };
    };

    const res = await documentReception("<factura>test</factura>", SRI_ENDPOINTS.test.reception, {
      fetchFn: mockFetch,
    });

    assert.strictEqual(res.estado, "RECIBIDA");
    assert.ok(capturedBody.includes("<ec:validarComprobante"));
    assert.ok(capturedBody.includes("<xml>"));
    assert.strictEqual(capturedUrl, "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline");
  });

  test("Llamada mock a Autorización Comprobantes", async () => {
    const mockXmlResponse = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <ns2:autorizacionComprobanteResponse xmlns:ns2="http://ec.gob.sri.ws.autorizacion">
      <RespuestaAutorizacionComprobante>
        <claveAccesoConsultada>2809202601179001234500110010010000000011234567818</claveAccesoConsultada>
        <numeroComprobantes>1</numeroComprobantes>
        <autorizaciones>
          <autorizacion>
            <estado>AUTORIZADO</estado>
            <numeroAutorizacion>2809202601179001234500110010010000000011234567818</numeroAutorizacion>
            <fechaAutorizacion>2026-09-28T12:00:00-05:00</fechaAutorizacion>
            <ambiente>PRUEBAS</ambiente>
          </autorizacion>
        </autorizaciones>
      </RespuestaAutorizacionComprobante>
    </ns2:autorizacionComprobanteResponse>
  </soap:Body>
</soap:Envelope>`;

    const mockFetch = async () => ({
      ok: true,
      status: 200,
      text: async () => mockXmlResponse,
    });

    const res = await documentAuthorization("2809202601179001234500110010010000000011234567818", SRI_ENDPOINTS.test.authorization, {
      fetchFn: mockFetch,
    });

    assert.strictEqual(res.numeroComprobantes, "1");
    assert.strictEqual(res.autorizaciones.autorizacion.estado, "AUTORIZADO");
  });

  test("Manejo de SOAP Fault con SoapFaultError", async () => {
    const mockFault = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <soap:Fault>
      <faultcode>soap:Server</faultcode>
      <faultstring>Error interno del servidor SRI</faultstring>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>`;

    const mockFetch = async () => ({
      ok: false,
      status: 500,
      text: async () => mockFault,
    });

    await assert.rejects(
      async () => {
        await sendSoapRequest("http://test.com", "", "<test/>", { fetchFn: mockFetch });
      },
      (err) => {
        assert.ok(err instanceof SoapFaultError);
        assert.ok(err.message.includes("Error interno del servidor SRI"));
        return true;
      }
    );
  });
});

describe("6. Paridad y compatibilidad híbrida (CJS y ESM)", () => {
  test("Exportaciones idénticas entre CommonJS y ESM", () => {
    const esmKeys = [
      "documentAuthorization",
      "documentReception",
      "sendSoapRequest",
      "generateInvoice",
      "generateInvoiceXml",
      "generatePurchaseLiquidation",
      "generatePurchaseLiquidationXml",
      "signXml",
      "signInvoiceXml",
      "signPurchaseLiquidationXml",
      "normalizeP12",
      "getP12FromLocalFile",
      "getP12FromUrl",
      "getXMLFromLocalFile",
      "getXMLFromLocalUrl",
      "buildXml",
      "parseXml",
      "generateAccessKey",
      "generateVerificatorDigit",
      "SRI_ENDPOINTS",
      "SRI_DOCUMENT_CODES",
      "SRI_IVA_PERCENTAGES",
      "SRI_RIMPE_LEGENDS",
    ];

    for (const key of esmKeys) {
      assert.ok(key in cjs, `La clave '${key}' debe estar exportada en CJS`);
    }
  });
});
