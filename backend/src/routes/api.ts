import express from 'express';
import AdmZip from 'adm-zip';
import { processXml, processXmlBatch, getAllData, getDocuments, getDocumentByUuid } from '../services/XmlService.js';
import { getDb, initializeTables, resetDatabase } from '../db/database.js';
import { generateZip } from '../tools/generate.js';

const router = express.Router();

export { getDb };

const BATCH_SIZE = 500;

router.post('/upload-zip', express.raw({ type: 'application/zip', limit: '500mb' }), async (req, res) => {
  try {
    await initializeTables();
    const zip = new AdmZip(req.body);
    const entries = zip.getEntries().filter(e => !e.isDirectory && e.name.endsWith('.xml'));
    
    if (entries.length === 0) {
      return res.status(400).json({ success: false, error: 'No XML files found in ZIP' });
    }
    
    const results: { filename: string; uuid: string; status: string }[] = [];
    let processed = 0;
    
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);
      const xmlStrings: string[] = [];
      
      for (const entry of batch) {
        try {
          xmlStrings.push(entry.getData().toString('utf8'));
        } catch (e) {
          results.push({ filename: entry.name, uuid: '', status: 'read_error' });
        }
      }
      
      try {
        const batchResults = await processXmlBatch(xmlStrings);
        for (let j = 0; j < batch.length; j++) {
          const r = batchResults[j];
          if (r) {
            results.push({ filename: batch[j].name, uuid: r.uuid, status: 'ok' });
          } else {
            results.push({ filename: batch[j].name, uuid: '', status: 'parse_error' });
          }
        }
      } catch (e) {
        for (const entry of batch) {
          results.push({ filename: entry.name, uuid: '', status: 'process_error' });
        }
      }
      
      processed += batch.length;
    }
    
    const ok = results.filter(r => r.status === 'ok').length;
    res.json({ success: true, data: { total: entries.length, processed, ok, failed: entries.length - ok, results } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/process', express.text({ type: 'application/xml', limit: '10mb' }), async (req, res) => {
  try {
    await initializeTables();
    const result = await processXml(req.body);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// /api/data - now handled by adba in index.ts

router.get('/documents', async (req, res) => {
  try {
    const docs = await getDocuments();
    res.json({ success: true, data: docs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/documents/:uuid', async (req, res) => {
  try {
    const doc = await getDocumentByUuid(req.params.uuid);
    res.json({ success: true, data: doc });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/documents/:uuid', async (req, res) => {
  try {
    const doc = await getDocumentByUuid(req.params.uuid);
    res.json({ success: true, data: doc });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/truncate', async (req, res) => {
  try {
    await resetDatabase();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/generate', async (req, res) => {
  try {
    const count = req.body.count || 100;
    await initializeTables();
    
    const generateModule = await import('../tools/generate.js');
    const generateInvoice = generateModule.generateInvoice || generateModule.default?.generateInvoice;
    
    if (!generateInvoice) {
      throw new Error('generateInvoice not found');
    }
    
    const AdmZipModule = (await import('adm-zip')).default;
    const zip = new AdmZipModule();
    
    for (let i = 0; i < count; i++) {
      const { uuid, xml } = generateInvoice(i);
      zip.addFile(`cfdi_${uuid}.xml`, Buffer.from(xml));
    }
    
    const zipData = zip.toBuffer();
    const entries = new AdmZipModule(zipData).getEntries().filter(e => !e.isDirectory && e.name.endsWith('.xml'));
    
    const xmlStrings: string[] = entries.map(e => e.getData().toString('utf8'));
    
    const xmlModule = await import('../services/XmlService.js');
    const processXmlBatch = xmlModule.processXmlBatch || xmlModule.default?.processXmlBatch;
    const results = await processXmlBatch(xmlStrings);
    
    const db = getDb();
    const [{ count: totalDocs }] = await db('documents').count('* as count');
    const [{ count: totalRows }] = await db('flattened_data').count('* as count');
    
    res.json({ 
      success: true, 
      data: { 
        count: entries.length, 
        loaded: results.length,
        totalDocuments: totalDocs,
        totalRows
      } 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;