const Users = require('../models/users');
const HttpStatus = require('http-status-codes');
const logger = require('../components/logger')(module);

/**
 * GET user/profile
 * @param {string} req - The incoming request.
 * @param {string} res - The outgoing response.
 */
function getProfile(req, res) {

}
/**
 * GET user/state
 * @param {string} req - The incoming request.
 * @param {string} res - The outgoing response.
 */
function getState(req, res) {

}
/**
 * POST user/profile
 * @param {string} req - The incoming request.
 * @param {string} res - The outgoing response.
 */
function postProfile(req, res) {

}

/**
 * GET user/verify
 * @param {string} req - The incoming request.
 * @param {string} res - The outgoing response.
 */
function getVerify(req, res) {
  try {
    const token = req.query.token;
    if (token) {
      Users.verifyUser(req.connection.remoteAddress, token)
          .then(function(user) {
            res.status(HttpStatus.OK).json({data: true});
          }).catch(function(err) {
            logger.error(`getVerify: error saving the user: ${err}`);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .json({data: false, err});
          });
    } else {
      res.status(HttpStatus.BAD_REQUEST)
          .json({data: false, error: 'Invalid or missing token'});
    }
  } catch (err) {
    logger.error(`getVerify: ${err}`);
    res.status(HttpStatus.BAD_REQUEST).json({data: false});
  }
}

/**
 * POST user/verify
 * @param {string} req - The incoming request.
 * @param {string} res - The outgoing response.
 */
function postVerify(req, res) {
  try {
    const bearer = req.headers.authorization ?
      req.headers.authorization.split(' ') : undefined;
    const token = bearer ? bearer[1] : undefined;
    if (token) {
      Users.verifyUser(req.connection.remoteAddress, token)
          .then(function(user) {
            res.status(HttpStatus.OK).json({data: true});
          }).catch(function(err) {
            logger.error(`postVerify: error saving the user: ${err}`);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .json({data: false, err});
          });
    } else {
      res.status(HttpStatus.BAD_REQUEST)
          .json({data: false, error: 'Invalid or missing token'});
    }
  } catch (err) {
    logger.error(`postVerify: ${err}`);
    res.status(HttpStatus.BAD_REQUEST).json({data: false});
  }
}

module.exports = {
  getProfile,
  getState,
  postProfile,
  getVerify,
  postVerify,
};
