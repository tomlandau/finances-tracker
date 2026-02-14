import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from 'dotenv';

// Import core API endpoints
import categoriesHandler from './api/categories';
import incomeHandler from './api/income';
import expenseHandler from './api/expense';
import recentHandler from './api/recent';
import updateHandler from './api/update';
import deleteHandler from './api/delete';

// Import auth endpoints
import loginHandler from './api/auth/login';
import logoutHandler from './api/auth/logout';
import refreshHandler from './api/auth/refresh';
import verifyHandler from './api/auth/verify';
import tfaHandler from './api/auth/2fa';
import loginTotpHandler from './api/auth/login-totp';

// Load environment variables
config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Request logging middleware
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Core API routes
app.get('/api/categories', categoriesHandler);
app.post('/api/income', incomeHandler);
app.post('/api/expense', expenseHandler);
app.get('/api/recent', recentHandler);
app.post('/api/update', updateHandler);
app.post('/api/delete', deleteHandler);

// Auth routes
app.post('/api/auth/login', loginHandler);
app.post('/api/auth/logout', logoutHandler);
app.post('/api/auth/refresh', refreshHandler);
app.get('/api/auth/verify', verifyHandler);
app.post('/api/auth/2fa', tfaHandler);
app.post('/api/auth/login-totp', loginTotpHandler);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
// Bind to 0.0.0.0 to accept connections from outside the container (required for Railway)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Listening on 0.0.0.0:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS origins: ${process.env.ALLOWED_ORIGINS || 'http://localhost:5173'}`);
});
