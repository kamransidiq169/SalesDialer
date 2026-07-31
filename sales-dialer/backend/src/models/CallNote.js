const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CallNote = sequelize.define('CallNote', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  callId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  aiSummary: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'AI generated summary, mocked',
  },
}, {
  timestamps: true,
});

module.exports = CallNote;
