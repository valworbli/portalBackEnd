const mongoose = require('mongoose');

const emailToken = new mongoose.Schema({
  email: {type: String, unique: true, required: true},
  token: {type: String, required: true},
  createdAt: {type: Date, required: true, default: Date.now, expires: 43200},
});

module.exports = mongoose.models.email_token ||
mongoose.model('email_token', emailToken);
