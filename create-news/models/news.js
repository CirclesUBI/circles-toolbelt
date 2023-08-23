const Sequelize = require('sequelize');

const { db } = require('../database.js');
const News = db.define('news', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title_en: {
    type: Sequelize.TEXT,
  },
  message_en: {
    type: Sequelize.TEXT,
  },
  date: {
    type: Sequelize.DATE,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
    defaultValue: Sequelize.NOW,
  },
  iconId: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  isActive: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
});

module.exports = { News }
