const Users = require('./schemas/users');
const Const = require('../defs/const.js');
const bigInt = require('big-integer');
const crypto = require('crypto');

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
      if (err) reject(err);

      if (user) {
        if (user.onfido_status === Const.ONFIDO_STATUS_UNVERIFIED) {
          Users.updateOne({email: email},
              {
                agreed_terms: agreedTerms,
                agreed_marketing: agreedMarketing,
              }, (function(err) {
                if (err) reject(err);
                else resolve(user);
              }));
        } else {
          reject(`User ${email} has already been verified.`);
        }
      } else {
        const securityCode = bigInt(
            Buffer.from(crypto.randomBytes(8)).toString('hex'), 16
        );
        const newUser = new Users({
          email: email,
          password: password,
          agreed_terms: agreedTerms,
          agreed_marketing: agreedMarketing,
          onfido_status: Const.ONFIDO_STATUS_UNVERIFIED,
          security_code: securityCode,
        });
        newUser.save(function(err, user) {
          if (err) reject(err);
          else resolve(newUser);
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
        reject('No such token exists!');
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

module.exports = {
  checkUpdateUser,
  verifyUser,
  prepareForgotToken,
  checkForgotToken,
};
