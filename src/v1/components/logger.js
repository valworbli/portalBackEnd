const loggerModel = require('../models/log.js');

/**
 * Sign JWT
 * @param {object} _action - The data to sign
 * @param {object} _email - The data to sign
 * @param {object} _data - The data to sign
 */
function log(_action, _email, _data) {
  const email = _email;
  const data = _data;
  const created_at = (new Date).getTime();
  const action = _action;
  const from = 'back end';
  const str_data = JSON.stringify(data);
  loggerModel({email, data: str_data, created_at, action, from}).save();
}

module.exports = {log};
