import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import Knex from 'knex';
import { expressRouter, routesObject, generateModels } from 'adba';
import apiRoutes from './routes/api.js';
import { initializeTables } from './db/database.js';

export interface ServerConfig {
  port?: number;
  enableFrontend?: boolean;
  frontendPath?: string;
}

export async function createApp(enableFrontend = false, frontendPath?: string): Promise<express.Application> {
  await initializeTables();

  const app = express();

  app.use(express.json({ limit: '10mb' }));
  app.use(express.text({ type: 'application/xml', limit: '10mb' }));

  app.use('/api', apiRoutes);

  const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'xml-flatten.db');
  const dbAdba = Knex({
    client: 'sqlite3',
    connection: { filename: dbPath },
    useNullAsDefault: true
  });

  try {
    const models = await generateModels(dbAdba);
    const routes = routesObject(models, {});
    const adbaRouter = expressRouter(routes, { debugLog: false });
    app.use('/api/data', adbaRouter);
    // Keep dbAdba alive for adba router
  } catch (e) {
    console.log('adba not available:', (e as Error).message);
    await dbAdba.destroy();
  }

  if (enableFrontend) {
    const baseDir = path.dirname(fileURLToPath(import.meta.url));
    const staticPath = frontendPath || path.join(baseDir, '..', '..', 'frontend', 'public');

    app.use(express.static(staticPath));
    app.get('/', (req, res) => {
      res.sendFile(path.join(staticPath, 'index.html'));
    });
  }

  return app;
}

export async function startServer(config: ServerConfig = {}): Promise<express.Application> {
  const port = config.port || Number(process.env.PORT) || 3000;
  const enableFrontend = config.enableFrontend ?? (process.env.ENABLE_FRONTEND === 'true');

  const app = await createApp(enableFrontend, config.frontendPath);

  return new Promise((resolve) => {
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
      if (enableFrontend) {
        console.log(`Frontend enabled at http://localhost:${port}`);
      }
      resolve(app);
    });
  });
}

export function createRouter() {
  return apiRoutes;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT) || 3000;
  const enableFrontend = process.env.ENABLE_FRONTEND === 'true';
  startServer({ port, enableFrontend });
}