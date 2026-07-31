/**
 * Backend server entry point
 * Sales Dialer CRM API
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// Import configuration
const { connectDatabase, sequelize } = require('./src/config/database');
const { logger, stream, addRequestId } = require('./src/config/logger');
const { setupSwagger } = require('./src/config/swagger');

// Import middleware
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');
const { apiLimiter } = require('./src/middleware/rateLimiter');

// Import routes
const authRoutes = require('./src/routes/auth');
const contactRoutes = require('./src/routes/contacts');
const callRoutes = require('./src/routes/calls');
const dashboardRoutes = require('./src/routes/dashboard');
const adminRoutes = require('./src/routes/admin');

// Import WebSocket handler
const { setupWebSocket } = require('./src/websocket');

// Import models for sync
const models = require('./src/models');

const app = express();
const PORT = process.env.PORT || 5000;

// =============================================================================
// SECURITY MIDDLEWARE
// =============================================================================

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
}));

// =============================================================================
// LOGGING
// =============================================================================

// Add request ID to all requests
app.use(addRequestId);

// Morgan HTTP logging with Winston
app.use(morgan('combined', { stream }));

// =============================================================================
// BODY PARSING
// =============================================================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =============================================================================
// STATIC FILES
// =============================================================================

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// =============================================================================
// RATE LIMITING
// =============================================================================

app.use('/api', apiLimiter);

// =============================================================================
// ROUTES
// =============================================================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);

// =============================================================================
// SWAGGER DOCUMENTATION
// =============================================================================

setupSwagger(app);

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// =============================================================================
// SERVER STARTUP & SHUTDOWN
// =============================================================================

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`, {
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
  });
  logger.info(`API Documentation available at http://localhost:${PORT}/api/docs`);
});

// Setup WebSocket for real-time features
setupWebSocket(server);

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      // Close database connection
      await sequelize.close();
      logger.info('Database connection closed');

      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Database connection and sync
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();
    logger.info('Database connected successfully');

    // Sync models - SQLite doesn't handle alter:true well (risky column migrations via backup tables)
    // Use force:false to avoid dropping tables, and manage schema changes manually when needed
    await sequelize.sync({ force: false });
    logger.info('Database models synchronized');

    logger.info('Server ready to accept connections');
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

// Export app for testing
module.exports = { app, server };