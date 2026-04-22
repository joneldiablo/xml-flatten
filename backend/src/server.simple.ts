import express, { Express, Request, Response } from 'express';
import path from 'path';

// Initialize Express app
const app: Express = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve frontend from the frontend directory (sibling to backend)
const frontendPath = path.join(__dirname, '../../frontend');
app.use('/', express.static(frontendPath));

// Simple test route
app.get('/api/test', (req: Request, res: Response) => {
  res.json({ message: 'XML Flatten API is running', timestamp: new Date().toISOString() });
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

export { app };