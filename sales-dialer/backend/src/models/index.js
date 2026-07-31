const { sequelize } = require('../config/database');
const User = require('./User');
const Contact = require('./Contact');
const Call = require('./Call');
const CallNote = require('./CallNote');

User.hasMany(Contact, { foreignKey: 'userId', as: 'contacts' });
Contact.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Contact.hasMany(Call, { foreignKey: 'contactId', as: 'calls' });
Call.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact' });

Call.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Call.hasMany(CallNote, { foreignKey: 'callId', as: 'notes' });
CallNote.belongsTo(Call, { foreignKey: 'callId', as: 'call' });

CallNote.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  sequelize,
  User,
  Contact,
  Call,
  CallNote,
};
