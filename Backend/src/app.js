/**
 * Cấu hình Express app
 * Load middleware, routes, và các cấu hình khác
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/env');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');
const { apiLimiter } = require('./middlewares/rateLimiter.middleware'); // ✅ NEW
const logger = require('./utils/logger');

const app = express();

// Middleware CORS
app.use(cors(config.cors));

// ✅ NEW: Apply rate limiting
app.use('/api/', apiLimiter);

// Middleware parse JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// API Routes
app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

