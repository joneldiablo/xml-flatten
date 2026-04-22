import express from 'express';
import { processXml, getAllData, getDocuments, getDocumentByUuid } from '../services/XmlService.js';
import { getDb } from '../db/database.js';

const router = express.Router();

router.post('/process', express.text({ type: 'application/xml', limit: '10mb' }), async (req, res) => {
  try {
    await getDb();
    const result = await processXml(req.body);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/data', async (req, res) => {
  try {
    await getDb();
    const query = {
      filters: req.query.filters ? JSON.parse(req.query.filters as string) : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      orderBy: req.query.orderBy ? JSON.parse(req.query.orderBy as string) : undefined,
      q: req.query.q as string | undefined,
    };
    const data = getAllData(query);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/documents', async (req, res) => {
  try {
    await getDb();
    const docs = getDocuments();
    res.json({ success: true, data: docs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/documents/:uuid', async (req, res) => {
  try {
    await getDb();
    const doc = getDocumentByUuid(req.params.uuid);
    res.json({ success: true, data: doc });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;