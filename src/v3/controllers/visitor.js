const Users = require('../models/users');
const HttpStatus = require('http-status-codes');
const logger = require('../components/logger')(module);
const emailSES = require('../components/email');

/**
 * POST visitor/signin
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 */
function postSignin(req, res) {

}

/**
 * POST visitor/join
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 * @property {string} req.body.email - the user's email
 * @property {string} req.body.password - the user's password
 * @property {boolean} req.body.agreedTerms - the user agreed to the terms
 * @property {boolean} req.body.agreedMarketing - the user opted in marketing
 */
function postJoin(req, res) {
  const {email, password, agreedTerms, agreedMarketing} = req.body;
  try {
    Users.checkUpdateUser(email, password, agreedTerms, agreedMarketing)
        .then(function(user) {
          logger.info(`User ${user.email} saved successfully in the DB!`);
          emailSES.sendEmail(user.email, user.verify_token, 'register')
              .then((data) => {
                const receipt = JSON.stringify(data);
                logger.info(
                    `Sent a VERIFY email to user ${user.email}, 
              receipt ID: ${receipt}`);
                res.status(HttpStatus.OK).json( {data: true} );
              }).catch((err) => {
                logger.error(`FAILED to send a VERIFY email to
                  ${user.email}: ${err}`);
                res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .json({data: false, error: err});
              });
        }).catch((err) => {
          logger.error(`User ${email} COULD NOT be saved to the DB: ` +
          JSON.stringify(err));
          res.status(HttpStatus.INTERNAL_SERVER_ERROR)
              .json({data: false, error: err});
        });
  } catch (err) {
    const error = `Error joining the user ${email}: ${err}`;
    logger.error(error);
    res.status(HttpStatus.BAD_REQUEST).json({data: false, error});
  }
}

/**
 * POST visitor/forgot
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 */
function postForgot(req, res) {
  const {email} = req.body;

  if (email) {
    Users.prepareForgotToken(req.connection.remoteAddress, email)
        .then(function(user) {
          emailSES.sendEmail(user.email, user.reset_token, 'reset')
              .then((data) => {
                const receipt = JSON.stringify(data);
                logger.info(
                    `Sent a FORGOT email to user ${user.email}, 
          receipt ID: ${receipt}`);
                res.status(HttpStatus.OK).json( {data: true} );
              }).catch((err) => {
                logger.error(`FAILED to send a FORGOT email to
            ${user.email}: ${err}`);
                res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .json({data: false, error: err});
              });
        }).catch((err) => {
          logger.error(`Could not prepare a FORGOT token for ${email}: ` +
          JSON.stringify(err));
          res.status(HttpStatus.INTERNAL_SERVER_ERROR)
              .json({data: false, error: err});
        });
  } else {
    const error = 'postForgot: Missing or invalid email';
    logger.error(error);
    res.status(HttpStatus.BAD_REQUEST).json({data: false, error});
  }
}

/**
 * POST visitor/forgotToken
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 */
function postForgotToken(req, res) {
  const {token} = req.body;

  if (token) {
    Users.checkForgotToken(token)
        .then(function(user) {
          res.status(HttpStatus.OK).json( {data: true} );
        }).catch((err) => {
          logger.error(`Could not verify the FORGOT token ${token}: ` +
          JSON.stringify(err));
          res.status(HttpStatus.BAD_REQUEST)
              .json({data: false, error: err});
        });
  } else {
    const error = 'postForgot: Missing or invalid token';
    logger.error(error);
    res.status(HttpStatus.BAD_REQUEST).json({data: false, error});
  }
}

/**
 * POST visitor/password
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 */
function postPassword(req, res) {

}

module.exports = {
  postSignin,
  postJoin,
  postForgot,
  postForgotToken,
  postPassword,
};
