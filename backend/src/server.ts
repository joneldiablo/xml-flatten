import express, { Express, Request, Response } from 'express';
import path from 'path';
import { DOMParser } from 'xmldom';
import { flatten } from 'dbl-utils';

// In-memory storage for demonstration
// In production, this would be replaced with a proper database
const flattenedDataStore: Array<{
  id: number;
  id_object: string;
  path: string;
  value: string;
  type: string;
  updated_at: string;
  created_at: string;
}> = [];

let nextId = 1;

// Initialize Express app
const app: Express = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve frontend from the frontend directory (sibling to backend)
const frontendPath = path.join(__dirname, '../../frontend');
app.use('/', express.static(frontendPath));

// API routes
app.post('/api/process-xml', async (req: Request, res: Response) => {
  try {
    let xmlString: string;

    // Check if XML is sent as file or raw string
    if (req.body.xml) {
      xmlString = req.body.xml;
    } else {
      // For simplicity, we're not handling file uploads in this version
      // In a production app, you would use multer or similar for file uploads
      return res.status(400).json({ error: 'No XML data provided' });
    }

    // Convert XML to JSON
    const jsonObject = xmlToJson(xmlString);

    // Generate a unique id_object for this document
    const id_object = require('crypto').randomUUID();

    // Flatten the JSON object
    const flattened = flatten(jsonObject, { delimiter: '.' });

    // Prepare data for insertion
    const entries = Object.entries(flattened).map(([path, value]) => ({
      id: nextId++,
      id_object,
      path,
      value: value !== null && value !== undefined ? String(value) : '',
      type: typeof value,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    }));

    // Insert into in-memory store
    flattenedDataStore.push(...entries);

    // Return success response
    res.json({
      success: true,
      id_object,
      count: entries.length,
      flattened: entries
    });
    return;
  } catch (error) {
    console.error('Error processing XML:', error);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }
});

// Get all flattened data (for demonstration)
app.get('/api/data', (req: Request, res: Response) => {
  res.json({
    success: true,
    count: flattenedDataStore.length,
    data: flattenedDataStore
  });
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
const startServer = async (port: number, host: string): Promise<void> => {
  app.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}`);
    console.log(`Frontend served from: ${frontendPath}`);
    console.log(`API endpoints available under /api/`);
    console.log(`In-memory data store has ${flattenedDataStore.length} entries`);
  });
};

export { app, startServer };

// Helper function to convert XML to JSON object
function xmlToJson(xmlString: string): any {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
  
  const parseElement = (element: ChildNode): any => {
    // Handle text nodes
    if (element.nodeType === 3) { // TEXT_NODE
      const text = element.textContent?.trim() ?? '';
      return text.length > 0 ? text : null;
    }
    
    // Handle element nodes
    if (element.nodeType !== 1) { // ELEMENT_NODE
      return null;
    }
    
    // Type assertion for Element
    const elem = element as Element;
    const obj: any = {};
    
    // Process attributes
    if (elem.attributes && elem.attributes.length > 0) {
      for (let i = 0; i < elem.attributes.length; i++) {
        const attr = elem.attributes[i];
        obj[`@${attr.name}`] = attr.value;
      }
    }
    
    // Process child elements
    if (elem.hasChildNodes()) {
      let hasElementChildren = false;
      let textContent = '';
      
      for (let i = 0; i < elem.childNodes.length; i++) {
        const child = elem.childNodes[i];
        if (child.nodeType === 1) { // ELEMENT_NODE
          hasElementChildren = true;
          const childObj = parseElement(child);
          
          // Handle multiple children with same tag name
          if (obj[child.nodeName]) {
            if (!Array.isArray(obj[child.nodeName])) {
              obj[child.nodeName] = [obj[child.nodeName]];
            }
            obj[child.nodeName].push(childObj);
          } else {
            obj[child.nodeName] = childObj;
          }
        } else if (child.nodeType === 3) { // TEXT_NODE
          textContent += child.textContent?.trim() ?? '';
        }
      }
      
      // If we have both text and element children, store text separately
      if (hasElementChildren && textContent.trim().length > 0) {
        obj['#text'] = textContent.trim();
      } 
      // If we only have text children, return the text directly
      else if (!hasElementChildren && textContent.trim().length > 0) {
        return textContent.trim();
      }
    }
    
    // Return object or null if empty
    return Object.keys(obj).length > 0 ? obj : null;
  };
  
  const root = xmlDoc.documentElement;
  return parseElement(root);
}