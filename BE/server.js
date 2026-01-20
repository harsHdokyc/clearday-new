import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { clerkMiddleware } from '@clerk/express';
import { requestLogger, errorHandler, notFound } from './middleware/errorHandler.js';
import dailyRoutes from './routes/daily.js';
import aiRoutes from './routes/ai.js';
import userRoutes from './routes/user.js';
import gamificationRoutes from './routes/gamification.js';
import logger from './utils/logger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration - allow frontend URLs
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins in development, restrict in production
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (should be after body parsing but before routes)
app.use(requestLogger);

// Clerk middleware configuration
const authorizedParties = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean); // Remove undefined values

app.use(clerkMiddleware({
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  secretKey: process.env.CLERK_SECRET_KEY,
  authorizedParties: authorizedParties
}));

// Configure MongoDB connection with environment-specific database name
const getMongoUri = () => {
  const env = process.env.NODE_ENV || 'development';
  const dbName = env === 'production' ? 'clearday_prod' : 'clearday_dev';
  
  // If MONGODB_URI is provided, replace or append database name
  if (process.env.MONGODB_URI) {
    const uri = process.env.MONGODB_URI;
    
    // MongoDB Atlas format: mongodb+srv://user:pass@cluster.mongodb.net/dbname?options
    // Local format: mongodb://localhost:27017/dbname
    
    // Check if URI already has a database name (before ? or at end)
    const dbMatch = uri.match(/mongodb(\+srv)?:\/\/[^/]+\/([^?]+)/);
    if (dbMatch) {
      // Replace existing database name
      return uri.replace(/\/[^/?]+(\?|$)/, `/${dbName}$1`);
    } else {
      // No database name - append it before query params or at end
      if (uri.includes('?')) {
        return uri.replace('?', `/${dbName}?`);
      } else {
        return `${uri}/${dbName}`;
      }
    }
  }
  
  // Default local MongoDB with environment-specific database
  return `mongodb://localhost:27017/${dbName}`;
};

const mongoUri = getMongoUri();

mongoose.connect(mongoUri)
  .then(() => {
    const dbName = mongoose.connection.db.databaseName;
    logger.info('[SERVER] MongoDB connected successfully', { 
      environment: process.env.NODE_ENV || 'development',
      database: dbName,
      uri: process.env.MONGODB_URI ? 'configured' : 'default'
    });
  })
  .catch(err => {
    logger.error('[SERVER] MongoDB connection error', err);
  });

// Root endpoint - for health checks and API info
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'ClearDay API is running',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      user: '/api/user',
      daily: '/api/daily',
      ai: '/api/ai',
      gamification: '/api/gamification'
    }
  });
});

app.use('/api/user', userRoutes);
app.use('/api/daily', dailyRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/gamification', gamificationRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'ClearDay API is running' });
});

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info('[SERVER] Server started successfully', { 
    port: PORT, 
    environment: process.env.NODE_ENV || 'development' 
  });
});
