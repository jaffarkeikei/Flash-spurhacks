require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { logger } = require('./utils/logger');
const { errorHandler } = require('./api/middleware/errorHandler');
const { testConnection, sequelize } = require('./db/config');
const { syncModels } = require('./db/models');
const { addDemoUser } = require('./api/controllers/authController');

// Import routes
const authRoutes = require('./api/routes/authRoutes');
const paymentRoutes = require('./api/routes/paymentRoutes');
const rateRoutes = require('./api/routes/rateRoutes');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());

// For development, use a more permissive CSP
app.use(helmet({
  contentSecurityPolicy: false // Disable CSP for development
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev', { stream: { write: message => logger.http(message.trim()) } }));

// Serve static files
app.use(express.static('public'));

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/rates', rateRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(errorHandler);

// Initialize database and start server
const initializeApp = async () => {
  try {
    // Test database connection
    await testConnection();
    
    // Sync models with database
    await syncModels();
    
    // Add demo user for testing
    await addDemoUser();
    
    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to initialize application', { error: error.message });
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection', { error: error.message });
  process.exit(1);
});

// Start the application
initializeApp();

module.exports = app; // For testing 