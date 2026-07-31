const winston = require('winston');
const path = require('path');
const fs = require('fs');
const { AsyncLocalStorage } = require('async_hooks');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output (development)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = JSON.stringify(meta, null, 2);
    }
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// JSON format for file output (production/log files)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports array
const transports = [
  // Console transport - always shown in development
  new winston.transports.Console({
    format: consoleFormat,
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  }),

  // Error log file - only errors
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),

  // Combined log file - all levels
  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),

  // HTTP request log file
  new winston.transports.File({
    filename: path.join(logsDir, 'http.log'),
    level: 'http',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 3,
  }),
];

// Create the logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  defaultMeta: { service: 'sales-dialer-api' },
  transports,
  exitOnError: false,
});

// Stream object for Morgan HTTP logging
const stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Create async local storage for request ID tracking
const asyncLocalStorage = new AsyncLocalStorage();

// Middleware to add request ID to all logs within a request
const addRequestId = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || generateRequestId();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  asyncLocalStorage.run({ requestId }, () => {
    next();
  });
};

// Helper to generate a simple request ID
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper to get current request ID
const getRequestId = () => {
  const store = asyncLocalStorage.getStore();
  return store ? store.requestId : null;
};

// Helper to log with request context
const logWithContext = (level, message, meta = {}) => {
  const requestId = getRequestId();
  if (requestId) {
    logger.log(level, message, { ...meta, requestId });
  } else {
    logger.log(level, message, meta);
  }
};

module.exports = {
  logger,
  stream,
  addRequestId,
  getRequestId,
  logWithContext,
};
