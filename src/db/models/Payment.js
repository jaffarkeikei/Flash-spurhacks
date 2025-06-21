const { DataTypes } = require('sequelize');
const { sequelize } = require('../config');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  senderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(18, 6),
    allowNull: false
  },
  fee: {
    type: DataTypes.DECIMAL(18, 6),
    allowNull: false
  },
  sourceCurrency: {
    type: DataTypes.STRING,
    allowNull: false
  },
  targetCurrency: {
    type: DataTypes.STRING,
    allowNull: false
  },
  recipient: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('created', 'processing', 'completed', 'failed'),
    defaultValue: 'created'
  },
  transactionHash: {
    type: DataTypes.STRING,
    allowNull: true
  },
  onChainPaymentId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  routeInfo: {
    type: DataTypes.JSON,
    allowNull: true
  }
});

module.exports = Payment; 