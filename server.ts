/**
 * AcademiaSec Full-Stack Server Entry Point
 * Mounts Express REST API endpoints with HTTPS/TLS security headers,
 * and mounts Vite middleware for development or serves static dist in production.
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { initDatabase } from './src/server/db.js';
import { securityHeadersMiddleware } from './src/server/security.js';
import { authRouter } from './src/server/routes/auth.js';
import { studentsRouter } from './src/server/routes/students.js';
import { coursesRouter } from './src/server/routes/courses.js';
import { apiKeysRouter } from './src/server/routes/apikeys.js';
import { securityRouter } from './src/server/routes/security.js';
import { testsRouter } from './src/server/routes/tests.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProd = process.env.NODE_ENV === 'production';

  // Seed database with pre-hashed credentials and initial records
  initDatabase();

  // Apply HTTPS & Defensive Security Headers globally
  app.use(securityHeadersMiddleware);

  // Parse JSON payloads with payload size bounding
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Request logger for audit & debugging
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      const start = performance.now();
      res.on('finish', () => {
        const duration = Math.round(performance.now() - start);
        console.log(`[API] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
      });
    }
    next();
  });

  // REST API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/students', studentsRouter);
  app.use('/api/courses', coursesRouter);
  app.use('/api/api-keys', apiKeysRouter);
  app.use('/api/security', securityRouter);
  app.use('/api/tests', testsRouter);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      tlsCompliant: true,
      service: 'AcademiaSec Student Management API',
    });
  });

  // Project ZIP Download Endpoint
  app.get('/api/download/project-zip', (req, res) => {
    const zipPath = path.resolve(__dirname, 'academiasec-student-management.zip');
    if (fs.existsSync(zipPath)) {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="academiasec-student-management.zip"');
      return res.sendFile(zipPath);
    } else {
      return res.status(404).json({ error: 'ZIP file not found. Please generate it first.' });
    }
  });

  // Vite Integration: Dev Middleware vs Production Static Serving
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    } else {
      console.warn('Production build directory "dist" not found. Falling back to dev mode handling.');
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AcademiaSec Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup failure:', err);
  process.exit(1);
});
