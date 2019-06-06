'use strict';
require('dotenv').config();
const logger = require('./src/v3/components/logger')(module);
const mongoose = require('mongoose');
const app = require('./src/express.js');
// const Promise = require('bluebird');
const SocketManager = require('./src/v3/components/Socket/socket');

mongoose.Promise = require('bluebird');

// mongoose.connect(`mongodb://${process.env.DB_HOST}/${process.env.DB_NAME}`, {useNewUrlParser: true});
mongoose.connect(process.env.DB_CONN, {
  dbName: process.env.DB_NAME, useNewUrlParser: true,
});

mongoose.connection.on('error', () => {
  throw new Error(`unable to connect to database: ${process.env.DB_NAME}`);
});

const server = app.listen(process.env.API_PORT, () => {
  logger.info(`API started on port ${process.env.API_PORT}`);
});

new SocketManager(server);

module.exports = app;
