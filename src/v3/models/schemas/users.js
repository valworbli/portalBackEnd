const Const = require('../../defs/const');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt-nodejs');
const crypto = require('crypto');

const usersSchema = new mongoose.Schema({
  email: {type: String, required: true, index: true, unique: true},
  agreed_terms: {type: Boolean, required: true},
  agreed_marketing: {type: Boolean},
  password: {type: String, required: true},
  worbli_account_name: {type: String, index: true},
  name_first: {type: String},
  name_middle: {type: String},
  name_last: {type: String},
  address_one: {type: String},
  address_two: {type: String},
  address_state: {type: String},
  address_town: {type: String},
  address_zip: {type: String},
  address_country: {type: String},
  phone_code: {type: String},
  phone_mobile: {type: Number},
  date_birth: {type: Date},
  gender: {type: String},
  security_code: {type: String, index: true},
  created_at: {type: Date, default: Date.now},
  updated_at: {type: Date, default: Date.now},
  onfido_status: {type: String, required: true},
  onfido_id: {type: String},
  verify_token: {type: String},
  verified_on: {type: Date},
  verified_from_ip: {type: String},
  reset_token: {type: String},
  reset_requested_on: {type: Date},
  reset_requested_from_ip: {type: String},
  reset_on: {type: Date},
  reset_from_ip: {type: String},
});

usersSchema.pre('save', function(next) {
  const user = this;
  if (this.isNew && !user.verify_token) {
    user.verify_token = crypto
        .randomBytes(Const.VERIFY_TOKEN_LENGTH / 2)
        .toString('hex');
  }

  if (this.isModified('password') || this.isNew) {
    bcrypt.genSalt(10, function(err, salt) {
      if (err) return next(err);
      bcrypt.hash(user.password, salt, null, function(err, hash) {
        if (err) return next(err);
        user.password = hash;
        next();
      });
    });
  } else {
    return next();
  }
});

usersSchema.methods.comparePassword = function(passw, cb) {
  bcrypt.compare(passw, this.password, function(err, isMatch) {
    if (err) {
      if (cb) return cb(err);
    } else {
      if (cb) cb(null, isMatch);
    }
  });
};

module.exports = mongoose.models.users ||
mongoose.model('users', usersSchema);
