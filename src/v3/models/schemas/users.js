const Const = require('../../defs/const');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt-nodejs');
const crypto = require('crypto');

const identityImagesSchema = new mongoose.Schema({
  completed: {type: Boolean, index: true},
  uploaded_documents: {type: Array},
  country: {type: String, index: true},
});

identityImagesSchema.methods.pushDocumentUnique = function(docName) {
  if (!this.uploaded_documents.includes(docName)) {
    this.uploaded_documents.push(docName);
  }
};

identityImagesSchema.methods.verify = function(accepted) {
  const missingDocuments = [];
  let docType = undefined;

  this.uploaded_documents.forEach((element) => {
    if (element !== Const.ID_SELFIE && !docType) {
      if (element.endsWith(Const.ID_REVERSE_SUFFIX)) {
        docType = element.substring(
            0, element.length - Const.ID_REVERSE_SUFFIX.length - 1
        );
      } else {
        docType = element;
      }
    }
  });

  if (!this.uploaded_documents.includes(Const.ID_SELFIE)) {
    missingDocuments.push(Const.ID_SELFIE);
  }

  if (!docType) {
    missingDocuments.push(Const.ID_IDENTITY);
  } else {
    // check the uploaded vs the required documents
    const backRequired = accepted[docType];
    if (!this.uploaded_documents.includes(docType)) {
      missingDocuments.push(docType);
    }
    if (backRequired.constructor !== Boolean) {
      return {error: 'Malformed request submitted!'};
    }
    if (backRequired) {
      const docTypeReverse = docType + '_' + Const.ID_REVERSE_SUFFIX;
      if (!this.uploaded_documents.includes(docTypeReverse)) {
        missingDocuments.push(docTypeReverse);
      }
    }
  }

  return {missingDocuments: missingDocuments};
};

const usersSchema = new mongoose.Schema({
  email: {type: String, required: true, index: true, unique: true},
  agreed_terms: {type: Boolean, required: true},
  agreed_marketing: {type: Boolean},
  password: {type: String, required: true},
  worbli_account_name: {type: String, index: true, unique: true},
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
  identity_images: identityImagesSchema,
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

usersSchema.methods.initIDImages = function() {
  if (!this.identity_images) {
    this.identity_images = {completed: false, uploaded_documents: []};
  }
};

module.exports = mongoose.models.users ||
mongoose.model('users', usersSchema);
