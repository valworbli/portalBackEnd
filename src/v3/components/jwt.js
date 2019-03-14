require('dotenv').config();
const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWT_SECRET;
const activeJwtModel = require('../models/schemas/activeJwt');

/**
 * Creates a signed JWT from the payload
 * @param {object} payload - The data to sign
 * @return {string} jwt
 */
function jwtSign(payload) {
  try {
    return jwt.sign(payload, jwtSecret);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log('jwtSign: ' + JSON.stringify(err));
  }
}

/**
 * Creates a signed JWT from the payload with expiration
 * https://www.npmjs.com/package/jsonwebtoken#token-expiration-exp-claim
 * @param {object} payload - The data to sign
 * @param {object} expiresIn - when to expire the JWT
 * @return {string} jwt - the token or null if an error occurred
 */
function jwtWithExpiry(payload, expiresIn) {
  try {
    return jwt.sign(payload, jwtSecret, {expiresIn});
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log('jwtExpires: ' + JSON.stringify(err));
    return null;
  }
}

/**
 * Decode the JWT
 * @param {string} token - The data to sign
 * @return {object} decoded - the JWT data or null on error
 */
function jwtDecode(token) {
  try {
    return jwt.verify(token, jwtSecret);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log('jwtDecode: ' + JSON.stringify(err));
    return null;
  }
}

/**
 * insert or update an active JWT
 * @param {string} email - The users email
 * @param {string} token - The token to check
 * @return {object} - a Promise
 */
function insertActiveJwt(email, token) {
  return new Promise(function(resolve, reject) {
    try {
      activeJwtModel
          .findOneAndUpdate({email}, {token}, {upsert: true}, (err, data) => {
            if (!err && data) {
              resolve(data);
            } else {
              reject(err);
            }
          });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log('insertActiveJwt: ' + JSON.stringify(err));
      reject(err);
    }
  });
}

/**
 * jwt was used - delete record
 * @param {string} email - The users email
 * @param {string} token - The token to check
 * @return {bool}
 */
function existingActiveJwt(email, token) {
  return new Promise(function(resolve, reject) {
    try {
      activeJwtModel.findOne({email, token}, (err, data) => {
        if (!err && data !== null) {
          activeJwtModel.deleteOne({email, token}, (err, data) =>{
            if (err) {
              reject(err);
            } else {
              resolve(data);
            }
          });
        } else {
          reject(data);
        }
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log('existingActiveJwt: ' + JSON.stringify(err));
      reject(err);
    }
  });
}

/**
 * Extract JWT
 * @param {object} req - The request that contains the JWT
 * @return {string} token - The jwt, if present or null otherwise
 */
function jwtExtract(req) {
  try {
    const bearer = req.headers.authorization ?
      req.headers.authorization.split(' ') : null;
    const token = bearer ? bearer[1] : null;
    return token;
  } catch (err) {
    return null;
  }
}

module.exports = {
  jwtSign,
  jwtWithExpiry,
  jwtDecode,
  insertActiveJwt,
  existingActiveJwt,
  jwtExtract,
};
