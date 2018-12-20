require('dotenv').config();
const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWT_SECRET;
const activeJwtModel = require('../models/activeJwt.js');

/**
 * Sign JWT
 * @param {object} payload - The data to sign
 * @return {string} jwt
 */
function jwtSign(payload) {
  try {
    return jwt.sign(payload, jwtSecret);
  } catch (err) {
    console.log(`jwt expires. ${err}`); // eslint-disable-line no-console
  }
}

/**
 * Sign JWT that Expires
 * @param {object} payload - The data to sign
 * @param {object} expiresIn - The number of hours to expire the JWT in
 * @return {string} jwt
 */
function jwtExpires(payload, expiresIn) {
  try {
    return jwt.sign(payload, jwtSecret, {expiresIn});
  } catch (err) {
    console.log(`jwt expires. ${err}`); // eslint-disable-line no-console
  }
}

/**
 * Decode the JWT
 * @param {string} token - The data to sign
 * @return {object} decoded - jwt data
 */
function jwtDecode(token) {
  try {
    return new Promise(function(resolve, reject) {
      jwt.verify(token, jwtSecret, (err, decoded) => {
        if (!err && decoded) {
          resolve(decoded);
        } else {
          reject(err);
        }
      });
    });
  } catch (err) {
    console.log(`jwt decode. ${err}`); // eslint-disable-line no-console
  }
}

/**
 * insert or update active jwt
 * @param {string} email - The users email
 * @param {string} token - The token to check
 */
function insertActiveJwt(email, token) {
  try {
    activeJwtModel
        .findOneAndUpdate({email}, {token}, {upsert: true}, (err, data) => {
          if (!err && data) {
            return;
          }
        });
  } catch (err) {
    `jwt decode. ${err}`;
  }
}

/**
 * jwt was used - delete record
 * @param {string} email - The users email
 * @param {string} token - The token to check
 * @return {bool}
 */
function existingActiveJwt(email, token) {
  try {
    return new Promise(function(resolve, reject) {
      activeJwtModel.findOne({email, token}, (err, data) => {
        if (!err && data !== null) {
          activeJwtModel.deleteOne({email, token}, (err, data) =>{
            resolve(true);
          });
        } else {
          resolve(false);
        }
      });
    });
  } catch (err) {
    return err;
  }
}

module.exports = {
  jwtSign,
  jwtExpires,
  jwtDecode,
  insertActiveJwt,
  existingActiveJwt,
};
