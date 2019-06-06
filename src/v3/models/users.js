const Users = require('./schemas/users');
const Const = require('../defs/const.js');
const bigInt = require('big-integer');
const crypto = require('crypto');
const logger = require('../components/logger')(module);

/**
 * getUserProfile
 * @param {string} email - the user's email
 * @return {Promise} a Promise with the user or an error
 */
function getUserProfile(email) {
  return new Promise(function(resolve, reject) {
    Users.findOne({email: email}, function(err, user) {
      if (err) reject(err);

      if (user) {
        resolve({email: user.email});
      } else {
        reject('Authentication error!');
      }
    });
  });
}

/**
 * authenticateUser
 * @param {string} email - the user's email
 * @param {string} plainPassword - the user's password
 * @return {Promise} a Promise with the user or an error
 */
function authenticateUser(email, plainPassword) {
  return new Promise(function(resolve, reject) {
    Users.findOne({email: email}, function(err, user) {
      if (err) reject(err);

      if (user) {
        user.comparePassword(plainPassword, function(err, isMatch) {
          if (err || !isMatch) reject('Authentication error!');
          else resolve(user);
        });
      } else {
        reject('Authentication error!');
      }
    });
  });
}

/**
 * findUserByShortCode
 * @param {integer} shortcode - the user's shortcode
 * @return {Promise} a Promise with the user or an error
 */
function findUserByShortCode(shortcode) {
  return new Promise(function(resolve, reject) {
    Users.findOne({shortcode: shortcode}, function(err, user) {
      if (err) {
        reject(err);
      } else {
        resolve(user);
      }
    });
  });
}

/**
 * checkUpdateUser
 * @param {string} email - the user's email
 * @param {string} password - the user's password
 * @param {boolean} agreedTerms - the user agreed to the terms
 * @param {boolean} agreedMarketing - the user opted in marketing
 * @return {Promise} a Promise with the user or an error
 */
function checkUpdateUser(email, password, agreedTerms, agreedMarketing) {
  return new Promise(function(resolve, reject) {
    Users.findOne({email: email}, function(err, user) {
      if (err) reject({err});

      if (user) {
        if (user.verify_token) {
          resolve({user: user, isNew: false});
        } else {
          reject({
            verified: true,
            err: `User ${email} has already been verified.`,
          });
        }
      } else {
        const securityCode = bigInt(
            Buffer.from(crypto.randomBytes(8)).toString('hex'), 16
        );
        const newUser = new Users({
          'email': email,
          'password': password,
          'agreed_terms': agreedTerms,
          'agreed_marketing': agreedMarketing,
          'onfido.onfido_status': Const.ONFIDO_STATUS_NONE,
          'onfido.onfido_error': false,
          'security_code': securityCode,
        });
        newUser.save(function(err, user) {
          if (err) reject({err});
          else resolve({user: newUser, isNew: true});
        });
      }
    });
  });
}

/**
 * verifyUser
 * @param {object} ip - the ip of the visitor
 * @param {string} token - the verification token
 * @return {Promise} a Promise with the user or an error
 */
function verifyUser(ip, token) {
  return new Promise(function(resolve, reject) {
    Users.findOne({verify_token: token}, function(err, user) {
      if (err) reject(err);

      if (user) {
        user.verify_token = '';
        user.verified_on = Date.now();
        user.verified_from_ip = ip;
        user.save(function(err, user) {
          if (err) reject(err);
          else resolve(user);
        });
      } else {
        reject('No such VERIFY token exists!');
      }
    });
  });
}

/**
 * resetUser
 * @param {object} ip - the ip of the visitor
 * @param {string} token - the verification token
 * @param {string} newPassword - the new password for the user
 * @return {Promise} a Promise with the user or an error
 */
function resetUser(ip, token, newPassword) {
  return new Promise(function(resolve, reject) {
    Users.findOne({reset_token: token}, function(err, user) {
      if (err) reject({reason: 'error', error: err});

      if (user) {
        user.reset_token = '';
        user.reset_on = Date.now();
        user.reset_from_ip = ip;
        user.password = newPassword;
        user.save(function(err, user) {
          if (err) reject({reason: 'dbfailure', error: err});
          else resolve(user);
        });
      } else {
        reject({reason: 'authentication',
          error: 'No such RESET token exists!'});
      }
    });
  });
}

/**
 * prepareForgotToken
 * @param {object} ip - the ip of the visitor
 * @param {string} email - the email of the user
 * @return {Promise} a Promise with the user or an error
 */
function prepareForgotToken(ip, email) {
  return new Promise(function(resolve, reject) {
    Users.findOne({email: email}, function(err, user) {
      if (err) reject(err);

      if (user) {
        user.reset_token = crypto
            .randomBytes(Const.RESET_TOKEN_LENGTH / 2)
            .toString('hex');
        user.reset_requested_on = Date.now();
        user.reset_requested_from_ip = ip;
        user.save(function(err, user) {
          if (err) reject(err);
          else resolve(user);
        });
      } else {
        reject('No such user');
      }
    });
  });
}

/**
 * checkForgotToken
 * @param {string} token - the forgot token
 * @return {Promise} a Promise with the user or an error
 */
function checkForgotToken(token) {
  return new Promise(function(resolve, reject) {
    Users.findOne({reset_token: token}, function(err, user) {
      if (err) reject(err);

      if (user) {
        resolve(user);
      } else {
        reject('No such token');
      }
    });
  });
}

/**
 * getByNetworkAccount
 * @param {string} accountName - the user's worbli account name
 * @return {Promise} a Promise with the user or an error
 */
function getByNetworkAccount(accountName) {
  return new Promise(function(resolve, reject) {
    Users.findOne({worbli_account_name: accountName}, function(err, user) {
      if (err) reject(err);

      if (user) {
        reject('Network name already taken');
      } else {
        resolve();
      }
    });
  });
}

/**
 * checkForgotToken
 * @param {string} email - the email of the user
 * @param {string} accountName - the name of the network account
 * @return {Promise} a Promise with the updated user, or an error
 */
function createNetworkAccount(email, accountName) {
  return new Promise(function(resolve, reject) {
    Users.findOne({email: email}, function(err, user) {
      if (err) reject({internal: true, error: err});

      if (user) {
        if (user.worbli_account_name) {
          reject({internal: false,
            error: 'Every user is limited to 1 (one) Worbli account.'});
        } else if (user.onfido.onfido_status !== Const.ONFIDO_STATUS_APPROVED) {
          reject({internal: false,
            // eslint-disable-next-line max-len
            error: 'Your profile must be verified before you can create a network account.'});
        } else {
          user.worbli_account_name = accountName;
          user.save(function(err, user) {
            if (err) {
              reject({internal: true,
                error: 'Internal error, please try again later.'});
            } else {
              resolve(user);
            }
          });
        }
      } else {
        // TODO: This should never happen
        // so we consider this an internal error...
        // eslint-disable-next-line max-len
        reject({internal: true, error: 'Internal error, please try again later'});
      }
    });
  });
}

/**
 * onfidoCheckCompleted
 * @param {string} userId - the user's ID
 * @param {string} onfidoStatus - the new OnFido status
 * @return {Promise} a Promise with the user or an error
 */
function onfidoCheckCompleted(userId, onfidoStatus) {
  return new Promise(function(resolve, reject) {
    Users.findOneAndUpdate({_id: userId},
        {$set: {'onfido.onfido_status': onfidoStatus}},
        {new: true},
        function(err, user) {
          if (err) {
            logger.error('onfidoCheckCompleted: User with id: ' +
              JSON.stringify(userId) + ' NOT FOUND: ' + JSON.stringify(err));
            reject({err});
          }

          if (user) {
            resolve(user);
          } else {
            reject('onfidoCheckCompleted: Could not find a user with id: ' +
              JSON.stringify(userId));
          }
        });
  });
}

/**
 * findByOnFidoCheck
 * @param {string} checkId - the user's email
 * @return {Promise} a Promise with the user or an error
 */
function findByOnFidoCheck(checkId) {
  return new Promise(function(resolve, reject) {
    Users.findOneAndUpdate(
        {'onfido.onfido_check': checkId},
        {'onfido.onfido_check': ''},
        {new: true, upsert: false},
        function(err, user) {
          if (err) {
            logger.error('User with OnFido check: ' +
          JSON.stringify(checkId) + ' NOT FOUND');
            reject({err});
          }

          if (user) {
            logger.info('Found a user ' + JSON.stringify(user.email)
          + ' for check ' + JSON.stringify(checkId));
            resolve(user);
          } else {
            logger.info('NO USER was found for check ' +
              JSON.stringify(checkId));
            reject('Could not find a user for this check');
          }
        });
  });
}

module.exports = {
  authenticateUser,
  checkUpdateUser,
  verifyUser,
  prepareForgotToken,
  checkForgotToken,
  resetUser,
  getByNetworkAccount,
  createNetworkAccount,
  getUserProfile,
  onfidoCheckCompleted,
  findByOnFidoCheck,
  findUserByShortCode,
};
