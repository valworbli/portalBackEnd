const mongoose = require('mongoose');

const SMSLog = new mongoose.Schema({
  user: {type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true},
  number: {type: String, required: true},
  message: {type: String, required: true},
  time: {type: Date, required: true, default: Date.now(), index: true},
});

module.exports = mongoose.models.smslog ||
mongoose.model('smslog', SMSLog);

module.exports.SMSLog = SMSLog;
