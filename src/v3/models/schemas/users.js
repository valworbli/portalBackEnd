/* eslint max-len: 0, guard-for-in: 0 */
const Const = require('../../defs/const');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt-nodejs');
const crypto = require('crypto');

const identityImagesSchema = new mongoose.Schema({
  completed: {type: Boolean, index: true},
  uploaded_documents: {type: Array},
  country: {type: String, index: true},
});

const shortcodeDataSchema = new mongoose.Schema({
  files: {type: String, required: true},
  country: {type: String, required: true, index: true},
});

identityImagesSchema.methods.pushDocumentUnique = function(docName, devId, data={}) {
  let index = undefined;
  for (const ind in this.uploaded_documents) {
    let doc = this.uploaded_documents[ind];
    if (doc.name === docName) {
      index = ind;
      break;
    }
  }

  if (index)
    this.uploaded_documents.splice(index, 1);

  this.uploaded_documents.push({...data, name: docName, id: devId});
};

identityImagesSchema.methods.delAllBut = function(docName, devId=0) {
  // if the document exist, check if it needs to be updated
  // else insert it in the array
  let onlyDoc = undefined;

  for (const doc of this.uploaded_documents) {
    if (doc.name === docName) {
      onlyDoc = {...doc};
      break;
    }
  }

  if (!onlyDoc) {
    onlyDoc = {name: docName, id: 0};
  }

  this.uploaded_documents = [onlyDoc];
};

identityImagesSchema.methods.delDocument = function(docName) {
  const index = this.includes(docName);

  if (index) {
    this.uploaded_documents.splice(index, 1);
    return true;
  }

  return false;
};

identityImagesSchema.methods.includes = function(docName) {
  let index = undefined;
  for (const ind in this.uploaded_documents) {
    if (this.uploaded_documents[ind].name === docName) {
      index = ind;
      break;
    }
  }

  return index;
};

identityImagesSchema.methods.includesWithoutError = function(docName) {
  let index = undefined;
  for (const ind in this.uploaded_documents) {
    const doc = this.uploaded_documents[ind];
    if (doc.name === docName && !doc.error) {
      index = ind;
      break;
    }
  }

  return index;
};

identityImagesSchema.methods.verify = function(accepted) {
  const missingDocuments = [];
  let docType = undefined;

  this.uploaded_documents.forEach((element) => {
    if (element.name !== Const.ID_SELFIE && !docType) {
      if (element.name.endsWith(Const.ID_REVERSE_SUFFIX)) {
        docType = element.name.substring(
            0, element.name.length - Const.ID_REVERSE_SUFFIX.length - 1
        );
      } else {
        docType = element.name;
      }
    }
  });

  if (this.includesWithoutError(Const.ID_SELFIE) === undefined) {
    missingDocuments.push(Const.ID_SELFIE);
  }

  if (!docType || (accepted[docType] === undefined)) {
    missingDocuments.push(Const.ID_IDENTITY);
  } else {
    // check the uploaded vs the required documents
    const backRequired = accepted[docType];
    if (this.includesWithoutError(docType) === undefined) {
      missingDocuments.push(docType);
    }
    if (backRequired.constructor !== Boolean) {
      return {error: 'Malformed request submitted!'};
    }
    if (backRequired) {
      const docTypeReverse = docType + '_' + Const.ID_REVERSE_SUFFIX;
      if (this.includesWithoutError(docTypeReverse) === undefined) {
        missingDocuments.push(docTypeReverse);
      }
    }
  }

  return {missingDocuments: missingDocuments};
};

const onFidoUsersSchema = new mongoose.Schema({
  onfido_status: {type: String, required: true},
  onfido_id: {type: String},
  onfido_error: {type: Boolean},
  onfido_check: {type: String},
  onfido_error_message: {type: String},
});

const SMSLimits = new mongoose.Schema({
  count: {type: Number, required: true},
  seconds: {type: Number, required: true},
});

const usersSchema = new mongoose.Schema({
  // email: {type: String, required: true, index: true, unique: true},
  email: {type: String, required: true, index: true},
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
  onfido: onFidoUsersSchema,
  verify_token: {type: String},
  verified_on: {type: Date},
  verified_from_ip: {type: String},
  reset_token: {type: String},
  reset_requested_on: {type: Date},
  reset_requested_from_ip: {type: String},
  reset_on: {type: Date},
  reset_from_ip: {type: String},
  identity_images: identityImagesSchema,
  shortcode: {type: String},
  shortcodeData: shortcodeDataSchema,
  sms_limits: [SMSLimits],
});

usersSchema.pre('save', function(next) {
  const user = this;
  user.updated_at = Date.now();

  if (this.isNew) {
    if (!user.onfido) {
      user.onfido = {
        onfido_status: Const.ONFIDO_STATUS_NONE,
        onfido_error: false,
        onfido_id: '',
      };
    }

    if (!user.sms_limits) {
      user.sms_limits = [];
      user.sms_limits.push({count: 3, seconds: 300});
      user.sms_limits.push({count: 10, seconds: 86400});
      user.sms_limits.push({count: 50, seconds: Const.MAX_DATE_VALUE});
    }

    if (!user.verify_token) {
      user.verify_token = crypto
          .randomBytes(Const.VERIFY_TOKEN_LENGTH / 2)
          .toString('hex');
    }
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

usersSchema.methods.initIDImages = function(force=false) {
  if (!this.identity_images || force) {
    this.identity_images = {completed: false, uploaded_documents: []};
  }
};

usersSchema.methods.getOnFidoStatus = function() {
  const resp = { };
  if (this.onfido) {
    resp['status'] = this.onfido.onfido_status;
    if (this.onfido.onfido_error) {
      resp['errored'] = true;
      resp['errorMessage'] = this.onfido.onfido_error_message;
    } else {
      resp['errored'] = false;
    }

    return resp;
  } else {
    return {status: Const.ONFIDO_STATUS_NONE, errored: false};
  }
};

module.exports = mongoose.models.users ||
mongoose.model('users', usersSchema);

module.exports.usersSchema = usersSchema;
