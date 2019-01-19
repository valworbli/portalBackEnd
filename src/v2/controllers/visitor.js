const logger = require('../components/logger')(module);
const userModel = require('../models/user.js');
const emailTokenModel = require('../models/emailToken.js');
const resetTokenModel = require('../models/resetToken.js');
const emailSender = require('../components/email.js');
const onfido = require('../components/onfido.js');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const bigInt = require('big-integer');
const saltRounds = 10;


/**
 * POST visitor/register
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 * @property {string} req.body.email - Users Email
 * @property {boolean} req.body.agreed_terms - agreed to the terms
 * @property {boolean} req.body.agreed_marketing - agreed to recieve marketing
 */
function postRegister(req, res) {
  const email = req.body.email;
  const agreedTerms = req.body.agreed_terms;
  const agreedMarketing = req.body.agreed_marketing;
  try {
    _checkUser(email, agreedTerms, agreedMarketing).then(function(res) {
      return _createEmailToken(email);
    }).then(function(token) {
      return emailSender.sendEmail(email, token.token, 'register');
    }).then(function(mail) {
      logger.info('email verification sent to %s', email);
      res.status(200).json({data: true});
    }).catch((err) => {
      logger.error('verification email for %s failed', email);
      logger.error(err);
      res.status(400).json({data: false, error: 'Error email verification'});
    });
  } catch (err) {
    const error = 'email post authorize';
    logger.error('error post authorize: %s', err);
    res.status(400).json({data: false, error});
  }
}

/**
 * POST visitor/validate
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 * @property {string} req.headers.authorization - The bearer token.
 */
function postValidate(req, res) {
  try {
    const bearer = req.headers.authorization.split(' ');
    const token = bearer[1];
    emailTokenModel.findOne({token})
        .then((data) => {
          if (data) {
            logger.info('email token %s valid for %s',
                data.token, data.email);
            res.status(200).json({data: true});
          } else {
            logger.info('email token %s not valid', token);
            res.status(400).json({data: false});
          }
        }).catch((err) => {
          logger.info('email token %s not valid', token);
          res.status(400).json({data: false});
        });
  } catch (err) {
    const error = 'email token validation failed';
    logger.info('postValidate error: %s', err);
    res.status(400).json({data: false, error});
  }
}

const _checkUser = function(email, agreedTerms, agreedMarketing) {
  return new Promise(function(resolve, reject) {
    userModel.findOne({email: email})
        .exec(function(err, user) {
          if (err) {
            reject(err);
          }
          if (user) {
            if (user.onfido_status === 'unverified') {
              userModel.updateOne(
                  {email: email},
                  {
                    agreed_terms: agreedTerms,
                    agreed_marketing: agreedMarketing,
                  })
                  .exec(function(err, user) {
                    if (err) {
                      reject(err);
                    } else {
                      resolve(user);
                    }
                  });
            } else {
              reject(`user ${email} already verified`);
            }
          } else {
            const securityCode = bigInt(
                Buffer.from(crypto.randomBytes(8)).toString('hex'), 16);
            userModel({
              email: email,
              agreed_terms: agreedTerms,
              agreed_marketing: agreedMarketing,
              onfido_status: 'unverified',
              security_code: securityCode,
            })
                .save()
                .then((user) => {
                  if (err) {
                    reject(err);
                  }
                  resolve(user);
                })
                .catch((err) => {
                  reject(err);
                });
          }
        });
  });
};

/**
 * _createToken
 * @param {string} email - the users email.
 * @return {string} token - the created token.
 */
function _createEmailToken(email) {
  // Question: Are you ok with me moving this to a component,
  // maybe components/token.js it will allow us seperate
  // unit and integration tests more easily
  return new Promise(function(resolve, reject) {
    emailTokenModel.deleteOne({email: email})
        .exec(function(err, user) {
          if (err) {
            reject(err);
          }
          emailTokenModel({
            email: email,
            token: crypto.randomBytes(16).toString('hex')})
              .save()
              .then((token) => {
                resolve(token);
              })
              .catch((err) => {
                reject(err);
              });
        });
  });
}

/**
 * _createToken
 * @param {string} email - the users email.
 * @return {string} token - the created token.
 */
function _createResetToken(email) {
  // Question: Are you ok with me moving this to a component,
  // maybe components/token.js it will allow us seperate
  // unit and integration tests more easily
  return new Promise(function(resolve, reject) {
    resetTokenModel.deleteOne({email: email})
        .exec(function(err, user) {
          if (err) {
            reject(err);
          }
          resetTokenModel({
            email: email,
            token: crypto.randomBytes(16).toString('hex')})
              .save()
              .then((token) => {
                resolve(token);
              })
              .catch((err) => {
                reject(err);
              });
        });
  });
}

const _getUser = function(email) {
  return new Promise(function(resolve, reject) {
    userModel.findOne({email: email})
        .exec(function(err, user) {
          if (err) {
            reject(err);
          }
          resolve(user);
        });
  });
};

/**
 * POST visitor/reset
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 * @property {string} req.body.email - The users email
 */
function postReset(req, res) {
  try {
    const email = req.body.email;
    _getUser(email).then((user) => {
      return _createResetToken(email);
    }).then((token) => {
      return emailSender.sendEmail(email, token.token, 'reset');
    }).then(() => {
      logger.info(`password reset email sent to ${email}`);
      res.status(200).json({data: true});
    }).catch((err) => {
      logger.error('error processing password reset for %s: %s', email, err);
      res.status(400).json({data: false});
    });
  } catch (err) {
    logger.error(err);
    const error = 'email post reset';
    res.status(400).json({data: false, error});
  }
}

/**
 * POST visitor/password
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 * @property {string} req.body.password - The users password
 * @property {string} req.body.token - The users token.
 */
function postPassword(req, res) {
  try {
    const plaintextPassword = req.body.password;
    const token = req.body.token;
    let email;
    _lookupEmailToken(token).then((token) => {
      return onfido.createApplicant(token);
    }).then((token) => {
      logger.error(token);
      email = token.email;
      return _savePassword(token, plaintextPassword);
    }).then((token) => {
      return _deleteEmailToken(token);
    }).then(() => {
      res.status(200).json({data: true, email});
    }).catch((err) => {
      logger.error(err);
      res.status(400).json({data: false, err});
    });
  } catch (err) {
    logger.error(err);
    const error = 'user post password failed';
    res.status(400).json({data: false, error});
  }
}

/**
 * POST visitor/password
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 * @property {string} req.body.password - The users password
 * @property {string} req.body.token - The users token.
 */
function postResetPassword(req, res) {
  try {
    const plaintextPassword = req.body.password;
    const token = req.body.token;
    let email;
    _lookupResetToken(token).then((token) => {
      email = token.email;
      return _updatePassword(token, plaintextPassword);
    }).then((token) => {
      return _deleteResetToken(token);
    }).then(() => {
      res.status(200).json({data: true, email});
    }).catch((err) => {
      logger.error(err);
      res.status(400).json({data: false, err});
    });
  } catch (err) {
    logger.error(err);
    const error = 'user reset password failed';
    res.status(400).json({data: false, error});
  }
}

const _lookupResetToken = function(token) {
  return new Promise(function(resolve, reject) {
    resetTokenModel.findOne({token: token})
        .exec(function(err, token) {
          if (err) {
            logger.error('_lookupResetToken: error looking up token %s: %s'
                , token, err);
            reject(err);
          } else {
            if (token) {
              resolve(token);
            } else {
              reject(`_lookupResetToken: token not found for ${token}`);
            }
          }
        });
  });
};


const _lookupEmailToken = function(token) {
  return new Promise(function(resolve, reject) {
    emailTokenModel.findOne({token: token})
        .exec(function(err, token) {
          if (err) {
            logger.error('_lookupEmailToken: error looking up token %s: %s'
                , token, err);
            reject(err);
          } else {
            if (token) {
              resolve(token);
            } else {
              reject(`_lookupEmailToken: token not found for ${token}`);
            }
          }
        });
  });
};

const _deleteResetToken = function(token) {
  return new Promise(function(resolve, reject) {
    resetTokenModel.findOneAndDelete(
        {email: token.email}
    ).then((user) => {
      logger.info('deleted token for %s', token.email);
      resolve();
    }).catch((err) => {
      logger.info('error deleting token for %s: %s', token.email, err);
      reject(err);
    });
  });
};

const _deleteEmailToken = function(token) {
  return new Promise(function(resolve, reject) {
    emailTokenModel.findOneAndDelete(
        {email: token.email}
    ).then((user) => {
      logger.info('deleted token for %s', token.email);
      resolve();
    }).catch((err) => {
      logger.info('error deleting token for %s: %s', token.email, err);
      reject(err);
    });
  });
};

const _updatePassword = function(token, password) {
  return new Promise(function(resolve, reject) {
    bcrypt.hash(password, saltRounds).then((hash) => {
      userModel.findOneAndUpdate(
          {email: token.email},
          {password: hash},
          {upsert: true}
      ).then((user) => {
        if (user) {
          logger.info('user %s password updated', token.email);
          resolve(token);
        } else {
          const error = `user ${token.email} not found`;
          logger.error('user %s not found', token.email);
          reject(error);
        }
      }).catch((err) => {
        reject(err);
      });
    });
  });
};


const _savePassword = function(token, password) {
  return new Promise(function(resolve, reject) {
    bcrypt.hash(password, saltRounds).then((hash) => {
      userModel.findOneAndUpdate(
          {email: token.email},
          {password: hash, onfido_status: 'default',
            onfido_id: token.onfido_id},
          {upsert: true}
      ).then((user) => {
        if (user) {
          logger.info('user %s password updated', token.email);
          resolve(token);
        } else {
          const error = `user ${token.email} not found`;
          logger.error('user %s not found', token.email);
          reject(error);
        }
      }).catch((err) => {
        reject(err);
      });
    });
  });
};


module.exports = {
  postRegister,
  postReset,
  postValidate,
  postPassword,
  postResetPassword,
};
