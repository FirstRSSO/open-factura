# open-factura-ec

Librería moderna en TypeScript/JavaScript para la facturación electrónica del Servicio de Rentas Internas (**SRI**) de Ecuador, compatible con la Ficha Técnica de Comprobantes Electrónicos v2.1.0 y optimizada para **Node.js 20+**.

---

## Novedades en la versión 1.0.0

- **Soporte Híbrido Completo (ESM + CJS):** Exportaciones duales `./dist/index.mjs` y `./dist/index.cjs` con definiciones de tipos TypeScript `./dist/index.d.ts`.
- **Eliminación de `node-fetch`:** Utiliza la API nativa global `fetch` de Node.js 20+, eliminando el error `ERR_REQUIRE_ESM`. Permite también inyectar clientes HTTP personalizados.
- **Eliminación de la dependencia `soap`:** Comunicación SOAP 1.1 directa mediante HTTP POST con sobres XML en texto plano y análisis ultraligero con `fast-xml-parser`. 10x más rápido, sin bloqueos ni caídas por esquemas WSDL inaccesibles.
- **Firma digital activa con `ec-sri-invoice-signer`:** Reemplazo del motor de firmado antiguo por [`ec-sri-invoice-signer`](https://github.com/bryancalisto/ec-sri-invoice-signer), con compatibilidad total para certificados `.p12` / `.pfx` emitidos en Ecuador (Banco Central, Security Data, Uanataca, ANF, Lazzate, etc.).
- **Tipado estricto SRI v2.1.0:**
  - Tarifa de IVA vigente del **15% (código 4)** y 5% (código 5), además de 0%, 12%, 14%, no objeto y exento.
  - Régimen RIMPE: `"CONTRIBUYENTE RÉGIMEN RIMPE"` y `"CONTRIBUYENTE NEGOCIO POPULAR - RÉGIMEN RIMPE"`.
  - **Liquidación de Compra de Bienes y Prestación de Servicios (código 03):** modelos, generación de XML y firmado dedicados.
- **Normalización estricta de orden XSD del SRI:** Ordenamiento automático de elementos (`<claveAcceso>` antes de `<codDoc>`, secuencias en `<infoFactura>`, impuestos y pagos) garantizando 100% de cumplimiento con los esquemas del SRI sin errores `cvc-complex-type.2.4.a`.
- **Generador de RIDE en PDF integrado:** Motor ligero con `pdfkit` y `bwip-js` (código de barras Code128 de 49 dígitos) con plantillas seleccionables (`'fullmegas'`, `'standard'`) y salida en `Buffer` o `Base64` sin requerir navegadores pesados ni Chromium.

---

## Instalación

```bash
npm install open-factura-ec
```

---

## Uso Rápido

### En ES Modules (import) o CommonJS (require)

```typescript
import {
  generateInvoice,
  generateInvoiceXml,
  signXml,
  documentReception,
  documentAuthorization,
  getP12FromLocalFile,
  SRI_ENDPOINTS,
  SRI_TAX_CODES,
  SRI_IVA_PERCENTAGES,
  SRI_RIMPE_LEGENDS,
} from "open-factura-ec";

// 1. Generar la estructura de la Factura y su clave de acceso
const { invoice, accessKey } = generateInvoice({
  infoTributaria: {
    ambiente: "1", // 1: Pruebas, 2: Producción
    tipoEmision: "1",
    razonSocial: "MI EMPRESA S.A.",
    nombreComercial: "MI TIENDA",
    ruc: "1790012345001",
    codDoc: "01", // 01: Factura
    estab: "001",
    ptoEmi: "001",
    secuencial: "000000001",
    dirMatriz: "Av. Principal 123",
    contribuyenteRimpe: SRI_RIMPE_LEGENDS.EMPRENDEDOR,
  },
  infoFactura: {
    fechaEmision: "28/09/2026",
    dirEstablecimiento: "Av. Principal 123",
    obligadoContabilidad: "NO",
    tipoIdentificacionComprador: "05", // 05: Cédula, 04: RUC, 07: Consumidor Final
    razonSocialComprador: "JUAN PEREZ",
    identificacionComprador: "1712345678",
    totalSinImpuestos: "100.00",
    totalDescuento: "0.00",
    totalConImpuestos: {
      totalImpuesto: [
        {
          codigo: SRI_TAX_CODES.IVA, // "2"
          codigoPorcentaje: SRI_IVA_PERCENTAGES.IVA_15, // "4" (15% IVA vigente)
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
          formaPago: "01", // Sin utilización del sistema financiero
          total: "115.00",
        },
      ],
    },
  },
  detalles: {
    detalle: [
      {
        codigoPrincipal: "PROD-001",
        descripcion: "Servicio de Consultoría",
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

// 2. Generar el XML limpio
const invoiceXml = generateInvoiceXml(invoice);

// 3. Firmar electrónicamente con el archivo .p12
const p12Buffer = getP12FromLocalFile("./firma.p12");
const signedXml = await signXml(p12Buffer, "contraseñaFirma", invoiceXml);

// 4. Enviar a Recepción del SRI (SOAP 1.1)
const reception = await documentReception(
  signedXml,
  SRI_ENDPOINTS.test.reception
);
console.log("Estado Recepción:", reception.estado); // "RECIBIDA" o "DEVUELTA"

// 5. Consultar Autorización en el SRI
const authorization = await documentAuthorization(
  accessKey,
  SRI_ENDPOINTS.test.authorization
);
console.log("Respuesta Autorización:", authorization);
```

---

## Liquidación de Compra (código 03)

```typescript
import {
  generatePurchaseLiquidation,
  generatePurchaseLiquidationXml,
  signPurchaseLiquidationXml,
} from "open-factura-ec";

const { purchaseLiquidation, accessKey } = generatePurchaseLiquidation({
  infoTributaria: {
    ambiente: "1",
    tipoEmision: "1",
    razonSocial: "EMPRESA COMPRADORA S.A.",
    ruc: "1790012345001",
    estab: "001",
    ptoEmi: "001",
    secuencial: "000000001",
    dirMatriz: "Quito, Ecuador",
  },
  infoLiquidacionCompra: {
    fechaEmision: "28/09/2026",
    obligadoContabilidad: "SI",
    tipoIdentificacionProveedor: "05",
    razonSocialProveedor: "PROVEEDOR POPULAR",
    identificacionProveedor: "1711122233",
    totalSinImpuestos: "50.00",
    totalDescuento: "0.00",
    totalConImpuestos: {
      totalImpuesto: [
        {
          codigo: "2",
          codigoPorcentaje: "4",
          baseImponible: "50.00",
          tarifa: "15.00",
          valor: "7.50",
        },
      ],
    },
    importeTotal: "57.50",
    pagos: {
      pago: [{ formaPago: "01", total: "57.50" }],
    },
  },
  detalles: {
    detalle: [
      {
        codigoPrincipal: "SER01",
        descripcion: "Mano de obra artesanal",
        cantidad: "1.000000",
        precioUnitario: "50.000000",
        descuento: "0.00",
        precioTotalSinImpuesto: "50.00",
        impuestos: {
          impuesto: [
            {
              codigo: "2",
              codigoPorcentaje: "4",
              tarifa: "15.00",
              baseImponible: "50.00",
              valor: "7.50",
            },
          ],
        },
      },
    ],
  },
});

const liquidationXml = generatePurchaseLiquidationXml(purchaseLiquidation);
const signedLiquidation = signPurchaseLiquidationXml(liquidationXml, p12Buffer, {
  pkcs12Password: "contraseña",
});
```

---

## Generación de RIDE en PDF (Estilos y Plantillas)

La librería incluye un motor nativo y ligero de generación de PDF RIDE (basado en `pdfkit` y `bwip-js`), que genera el código de barras oficial Code128 de 49 dígitos sin requerir Chromium/Puppeteer ni navegadores pesados:

```typescript
import { generateRidePdf, generateRidePdfBase64 } from "open-factura-ec";
import fs from "fs";

// Opción 1: Plantilla idéntica a 'Fullmegas' (cajas redondeadas, encabezado doble, diseño clásico)
const pdfBufferFullmegas = await generateRidePdf(invoice, {
  template: "fullmegas",
  logo: fs.readFileSync("./mi-logo.png"), // Opcional
  authorization: {
    numeroAutorizacion: "2909202601179001234500110010010000000011234567818",
    fechaAutorizacion: "29/09/2026 14:30:00",
    ambiente: "PRODUCCIÓN",
  },
});

fs.writeFileSync("./factura-fullmegas.pdf", pdfBufferFullmegas);

// Opción 2: Plantilla Moderna / Estándar (con acentos de color personalizados)
const pdfBufferStandard = await generateRidePdf(invoice, {
  template: "standard",
  primaryColor: "#0D9488", // Color corporativo (Teal, Azul, etc.)
  logo: "./mi-logo.png",
});

// Opción 3: Para devolver directamente en APIs REST / JSON (NestJS / Next.js)
const base64Pdf = await generateRidePdfBase64(invoice, {
  template: "fullmegas",
});
// { pdf: { base64: base64Pdf, filename: "factura.pdf" } }

// Opción 4: Función de renderizado personalizada
const customPdf = await generateRidePdf(invoice, {
  template: (doc, data, options) => {
    doc.text(`Factura personalizada para ${data.comprador.razonSocial}`);
    // Personalización libre utilizando la API de PDFKit
  },
});
```

---

## Endpoints Oficiales del SRI

Los endpoints están disponibles en las constantes `SRI_ENDPOINTS`:

```typescript
import { SRI_ENDPOINTS } from "open-factura-ec";

// Pruebas (Test):
SRI_ENDPOINTS.test.reception;     // https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline
SRI_ENDPOINTS.test.authorization; // https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline

// Producción:
SRI_ENDPOINTS.production.reception;     // https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline
SRI_ENDPOINTS.production.authorization; // https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline
```

---

## Licencia

MIT © 2026

