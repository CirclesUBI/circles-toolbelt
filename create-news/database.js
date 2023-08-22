const Sequelize = require('sequelize');
const fs = require('fs');

const DB_CONNECTION = "DB_CONNECTION_STRING"
const url = DB_CONNECTION;
const dialect = 'postgres';
const dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: false,
      ca: fs.readFileSync("PATH_TO_CERT")
    },
  };
const ssl = true;

const db = new Sequelize(url, {
  dialect,
  dialectOptions,
  ssl,
  logging: (msg) => {
    console.log(msg);
  },
});

module.exports = {
    db,
}

