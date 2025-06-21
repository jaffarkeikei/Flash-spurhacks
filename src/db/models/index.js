const User = require('./User');
const Payment = require('./Payment');
const { sequelize } = require('../config');
const { logger } = require('../../utils/logger');

// Define relationships between models
User.hasMany(Payment, { foreignKey: 'senderId', as: 'payments' });
Payment.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

// Sync all models with database
const syncModels = async () => {
  try {
    await sequelize.sync({ alter: true });
    logger.info('All models were synchronized successfully');
  } catch (error) {
    logger.error('Failed to synchronize models', { error: error.message });
    throw error;
  }
};

module.exports = {
  User,
  Payment,
  syncModels
}; 