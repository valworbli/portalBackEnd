const mongoose = require('mongoose');

const adminUserSchema = new mongoose.Schema({
  email: {type: String, required: true, index: true, unique: true},
  password: {type: String},
  level: {type: String},
});

module.exports = mongoose.model('AdminUser', adminUserSchema);
