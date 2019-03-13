'use strict';
require('dotenv').config();
const logger = require('./src/v3/components/logger')(module);
const mongoose = require('mongoose');
const app = require('./src/express.js');
const Promise = require('bluebird');
mongoose.Promise = Promise;

mongoose.connect(`mongodb://${process.env.DB_HOST}/${process.env.DB_NAME}`, {useNewUrlParser: true});

mongoose.connection.on('error', () => {
  throw new Error(`unable to connect to database: ${process.env.DB_NAME}`);
});

app.listen(process.env.API_PORT, () => {
  logger.info(`API started on port ${process.env.API_PORT}`);
});

module.exports = app;
