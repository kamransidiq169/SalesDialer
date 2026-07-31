const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Call = sequelize.define('Call', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  contactId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'in seconds',
  },
  status: {
    type: DataTypes.ENUM('initiated', 'calling', 'connected', 'ended', 'missed'),
    defaultValue: 'initiated',
  },
}, {
  timestamps: true,
});

module.exports = Call;
