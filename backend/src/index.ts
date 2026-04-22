import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './routes/api.js';
import { getDb, closeDb } from './db/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function startServer(port: number = 3000, enableFrontend: boolean = false): Promise<void> {
  await getDb();
  
  const app = express();
  
  app.use(express.json({ limit: '10mb' }));
  app.use(express.text({ type: 'application/xml', limit: '10mb' }));
  
  app.use('/api', apiRoutes);
  
  if (enableFrontend) {
    const baseDir = path.dirname(fileURLToPath(import.meta.url));
    const frontendPath = process.env.FRONTEND_PATH 
      ? path.resolve(process.env.FRONTEND_PATH)
      : path.join(baseDir, '..', '..', 'frontend', 'public');
    
    app.use(express.static(frontendPath));
    app.get('/', (req, res) => {
      res.sendFile(path.join(frontendPath, 'index.html'));
    });
  }
  
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    if (enableFrontend) {
      console.log(`Frontend enabled at http://localhost:${port}`);
    }
  });
  
  process.on('SIGINT', () => {
    closeDb();
    process.exit(0);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer(3000, true);
}