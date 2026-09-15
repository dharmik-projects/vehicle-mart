import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import connectDB from './config/db';
import routes from './routes';
import { errorHandler, AppError } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api', routes);

// 404 handler
app.use((_req, _res, next) => {
  next(new AppError('Route not found', 404));
});

// Error handler
app.use(errorHandler);

// Start server — DB must connect before accepting requests
const start = async () => {
  try {
    await connectDB();
  } catch (error) {
    console.error('');
    console.error('========================================');
    console.error('  FATAL: MongoDB connection failed');
    console.error('  ' + (error as Error).message);
    console.error('  Server will NOT start without database.');
    console.error('  Check your MONGODB_URI and network.');
    console.error('========================================');
    console.error('');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
  });
};

start();
