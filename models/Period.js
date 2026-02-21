const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Period = sequelize.define('Period', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  painLevel: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  fatigueLevel: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  mood: {
    type: DataTypes.STRING
  },
  symptoms: {
    type: DataTypes.TEXT, // Store as JSON string or comma-separated
    get() {
      const rawValue = this.getDataValue('symptoms');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('symptoms', JSON.stringify(value));
    }
  }
});

module.exports = Period;