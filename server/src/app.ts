import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { allowedOrigins } from './config/env';
import { notFound } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import menuRoutes from './routes/menu.routes';
import orderRoutes from './routes/order.routes';
import publicRoutes from './routes/public.routes';
import kitchenRoutes from './routes/kitchen.routes';
import billRoutes from './routes/bill.routes';
import reportRoutes from './routes/report.routes';
import { apiLimiter } from './middleware/rateLimit';
import morgan from 'morgan';

const app = express();

// --- Security & parsing middleware ---
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true, // required: we send/receive the auth cookie cross-origin
  }),
);
app.use(express.json({ limit: '10kb' }));
app.use('/api', apiLimiter);
app.use(cookieParser());

// --- Health check ---
app.get('/api/v1/health', (_req, res) => {
  const dbState = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    status: 'ok',
    db: dbState,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// --- Routes ---
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/menu', menuRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/public', publicRoutes);
app.use('/api/v1/kitchen', kitchenRoutes);
app.use('/api/v1/bills', billRoutes);
app.use('/api/v1/reports', reportRoutes);

// --- 404 + central error handler (must stay last) ---
app.use(notFound);
app.use(errorHandler);

export { app };
