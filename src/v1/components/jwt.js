require('dotenv').config();
const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWT_SECRET;

/**
 * Sign JWT
 * @param {object} payload - The data to sign
 * @return {string} jwt
 */
function jwtSign(payload) {
  return jwt.sign(payload, jwtSecret);
}

/**
 * Sign JWT that Expires
 * @param {object} payload - The data to sign
 * @param {object} expiresIn - The number of hours to expire the JWT in
 * @return {string} jwt
 */
function jwtExpires(payload, expiresIn) {
  return jwt.sign(payload, jwtSecret, {expiresIn});
}

/**
 * Decode the JWT
 * @param {string} token - The data to sign
 * @return {object} decoded - jwt data
 */
function jwtDecode(token) {
  return new Promise(function(resolve, reject) {
    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (!err && decoded) {
        resolve(decoded);
      } else {
        reject(err);
      }
    });
  });
}

module.exports = {jwtSign, jwtExpires, jwtDecode};
