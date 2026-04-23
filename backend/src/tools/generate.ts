import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import AdmZip from 'adm-zip';

const RFC_EMISORES = [
  { rfc: 'BSI061110963', nombre: 'BANCOPPEL, S.A., INSTITUCION DE BANCA MULTIPLE', regimen: '601' },
  { rfc: 'EKU9003173C1', nombre: 'ELEKTRA, S.A. DE C.V.', regimen: '601' },
  { rfc: '葵AA9506291H7', nombre: 'WALMART DE MEXICO, S.A. DE C.V.', regimen: '601' },
  { rfc: 'AMF9501257E5', nombre: 'COORSERVE DE MEXICO, S.A. DE C.V.', regimen: '601' },
  { rfc: 'TOM0506303G2', nombre: 'HOME DEPOT MEXICO, S. DE R.L. DE C.V.', regimen: '601' },
];

const RFC_RECEPTORES = [
  { rfc: 'RORJ8805231G1', nombre: 'JONATHAN DIEGO RODRIGUEZ RODRIGUEZ' },
  { rfc: 'MADR850101A23', nombre: 'MARIA DEL ROSARIO PEREZ GONZALEZ' },
  { rfc: 'XAXX010101A24', nombre: 'PUBLICO EN GENERAL' },
  { rfc: 'CACR800326F92', nombre: 'CARLOS ANDRES CRUZ RAMIREZ' },
  { rfc: 'LOZA750215A45', nombre: 'LAURA OLIVA ZARAGOZA' },
];

const CONCEPTOS = [
  { descripcion: 'SERVICIOS DE FACTURACION', claveProdServ: '84121500', unidad: 'Unidad de Servicio' },
  { descripcion: 'RENTA DE EQUIPO DE COMPUTO', claveProdServ: '83111500', unidad: 'Unidad' },
  { descripcion: 'SERVICIO DE CONSULTORIA PROFESIONAL', claveProdServ: '84111502', unidad: 'Hora' },
  { descripcion: 'MATERIAL DE OFICINA', claveProdServ: '44101601', unidad: 'Pieza' },
  { descripcion: 'FLETES Y ACARREOS LOCALES', claveProdServ: '83101901', unidad: 'Viaje' },
  { descripcion: 'REPARACION Y MANTENIMIENTO', claveProdServ: '72101500', unidad: 'Trabajo' },
  { descripcion: 'SERVICIOS INTEGRALES DE AUDITORIA', claveProdServ: '84111601', unidad: 'Trabajo' },
  { descripcion: 'LICENCIAMIENTO DE SOFTWARE', claveProdServ: '81101700', unidad: 'Licencia' },
  { descripcion: 'CAPACITACION EMPRESARIAL', claveProdServ: '86101501', unidad: 'Sesion' },
  { descripcion: 'CONSULTORIA DE SISTEMAS', claveProdServ: '81111506', unidad: 'Hora' },
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysBack = 365): string {
  const d = new Date();
  d.setDate(d.getDate() - randomInt(0, daysBack));
  d.setHours(randomInt(6, 20), randomInt(0, 59), randomInt(0, 59));
  return d.toISOString().replace('T', 'T').substring(0, 19);
}

function randomRFC(): string {
  const letras = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  const nums = '1234567890';
  let rfc = '';
  for (let i = 0; i < 4; i++) rfc += letras[randomInt(0, letras.length - 1)];
  rfc += randomInt(10, 99).toString();
  for (let i = 0; i < 6; i++) rfc += nums[randomInt(0, nums.length - 1)];
  rfc += letras[randomInt(0, letras.length - 1)];
  return rfc;
}

function generateSello(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/';
  let s = '';
  for (let i = 0; i < 344; i++) s += chars[randomInt(0, chars.length - 1)];
  return s;
}

function generateCertificado(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let s = '';
  for (let i = 0; i < 2048; i++) s += chars[randomInt(0, chars.length - 1)];
  return s;
}

function generateUUID(): string {
  return uuidv4().toUpperCase();
}

export function generateInvoice(index: number): { uuid: string; xml: string } {
  const emisor = randomItem(RFC_EMISORES);
  const receptor = randomItem(RFC_RECEPTORES);
  const concepto = randomItem(CONCEPTOS);
  const uuid = generateUUID();
  const fecha = randomDate(180);
  const fechaTimbrado = fecha;
  const folio = randomInt(10000000, 99999999).toString();
  const serie = randomItem(['A', 'B', 'C', 'F', 'M']);
  const noCert = randomInt(100000000000, 999999999999).toString();
  const noCertSAT = randomInt(100000000000, 999999999999).toString();
  const subtotal = randomFloat(10, 50000);
  const descuento = Math.random() > 0.7 ? randomFloat(0, subtotal * 0.1) : 0;
  const total = subtotal - descuento;
  const rfcProvCertif = 'CSH' + randomInt(10, 99).toString().padStart(2, '0') + randomInt(10, 99).toString().padStart(2, '0') + 'V' + randomInt(10, 99).toString().padStart(2, '0');
  const lugarExp = randomItem(['11800', '11000', '06600', '64000', '50000']);
  const usoCfdi = randomItem(['P01', 'P02', 'P03', 'G01', 'G02', 'G03']);
  const metodoPago = randomItem(['PUE', 'PPD']);
  const moneda = randomItem(['MXN', 'USD', 'EUR']);
  
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" xmlns:if="https://www.interfactura.com/Schemas/Documentos" Sello="${generateSello()}" Certificado="${generateCertificado()}" xsi:schemaLocation="http://www.sat.gob.mx/cfd/3 http://www.sat.gob.mx/sitio_internet/cfd/3/cfdv33.xsd" Version="3.3" Serie="${serie}" Folio="${folio}" Fecha="${fecha}" FormaPago="${randomItem(['03', '04', '28', '01'])}" NoCertificado="${noCert}" SubTotal="${subtotal.toFixed(2)}" Descuento="${descuento > 0 ? descuento.toFixed(2) : '0.00'}" Moneda="${moneda}" Total="${total.toFixed(2)}" MetodoPago="${metodoPago}" LugarExpedicion="${lugarExp}" TipoDeComprobante="${randomItem(['I', 'E', 'T', 'N'])}">
<cfdi:Emisor Rfc="${emisor.rfc}" Nombre="${emisor.nombre}" RegimenFiscal="${emisor.regimen}"/>
<cfdi:Receptor Rfc="${receptor.rfc}" Nombre="${receptor.nombre}" UsoCFDI="${usoCfdi}"/>
<cfdi:Conceptos>
<cfdi:Concepto Cantidad="${randomInt(1, 10)}" Unidad="${concepto.unidad}" Descripcion="${concepto.descripcion}" ValorUnitario="${randomFloat(10, 5000).toFixed(2)}" Importe="${subtotal.toFixed(2)}" ClaveProdServ="${concepto.claveProdServ}" ClaveUnidad="${randomItem(['E48', 'H87', 'P87', 'MTR', 'MTK'])}"/>
</cfdi:Conceptos>
<cfdi:Complemento>
<tfd:TimbreFiscalDigital Version="1.1" UUID="${uuid}" FechaTimbrado="${fechaTimbrado}" RfcProvCertif="${rfcProvCertif}" SelloCFD="${generateSello()}" NoCertificadoSAT="${noCertSAT}" SelloSAT="${generateSello()}" xsi:schemaLocation="http://www.sat.gob.mx/TimbreFiscalDigital http://www.sat.gob.mx/sitio_internet/cfd/TimbreFiscalDigital/TimbreFiscalDigitalv11.xsd"/>
</cfdi:Complemento>
</cfdi:Comprobante>`;
  
  return { uuid, xml };
}

export async function generateZip(count: number, outputPath: string, format: 'zip' | 'dir' = 'zip'): Promise<string> {
  const tempDir = `/tmp/cfdi-gen-${Date.now()}`;
  fs.mkdirSync(tempDir, { recursive: true });
  
  console.log(`Generating ${count} invoices...`);
  for (let i = 0; i < count; i++) {
    const { uuid, xml } = generateInvoice(i);
    const filename = `cfdi_${uuid}.xml`;
    fs.writeFileSync(path.join(tempDir, filename), xml);
    if ((i + 1) % 100 === 0) {
      console.log(`  ${i + 1}/${count} generated`);
    }
  }
  
  if (format === 'zip') {
    const zip = new AdmZip();
    for (const file of fs.readdirSync(tempDir)) {
      zip.addFile(file, fs.readFileSync(path.join(tempDir, file)));
    }
    zip.writeZip(outputPath);
    console.log(`ZIP created: ${outputPath}`);
  } else {
    fs.mkdirSync(outputPath, { recursive: true });
    for (const file of fs.readdirSync(tempDir)) {
      fs.copyFileSync(path.join(tempDir, file), path.join(outputPath, file));
    }
    console.log(`Files saved to: ${outputPath}`);
  }
  
  for (const file of fs.readdirSync(tempDir)) {
    fs.unlinkSync(path.join(tempDir, file));
  }
  fs.rmdirSync(tempDir);
  
  return outputPath;
}