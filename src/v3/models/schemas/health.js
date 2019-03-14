const Const = require('../../defs/const.js');
const mongoose = require('mongoose');
const crypto = require('crypto');

const healthSchema = new mongoose.Schema({
  token: {type: String, required: true, unique: true},
});

healthSchema.methods.initToken = function() {
  this.token = crypto
      .randomBytes(Const.VERIFY_TOKEN_LENGTH / 2)
      .toString('hex');

  return this.token;
};

module.exports = mongoose.models.health ||
mongoose.model('health', healthSchema);
