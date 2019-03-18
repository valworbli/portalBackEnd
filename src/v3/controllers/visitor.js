const Users = require('../models/users');
const HttpStatus = require('http-status-codes');
const logger = require('../components/logger')(module);
const emailSES = require('../components/email');
const jwt = require('../components/jwt');

/**
 * POST visitor/signin
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 */
function postSignin(req, res) {
  const email = req.body.email;
  const plaintextPassword = req.body.password;

  Users.authenticateUser(email, plaintextPassword)
      .then(function(user) {
        if (user.verify_token) {
          res.status(HttpStatus.CONFLICT)
              // eslint-disable-next-line max-len
              .json({data: false, error: 'Please verify your email - check your mailbox for activation instructions.'});
        } else {
          const token = jwt.jwtWithExpiry({email}, '72h');
          res.status(HttpStatus.OK).json({data: true, jwt: token});
        }
      }).catch((err) => {
        logger.error('Error authenticating the user: ' + JSON.stringify(err));
        res.status(HttpStatus.UNAUTHORIZED)
            .json({
              data: false,
              error: 'Invalid email address or password. Please try again.'});
      });
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
        .then(function(dbRes) {
          const {user, isNew} = dbRes;
          const action = isNew ? 'inserted' : 'updated';
          logger.info(`User ${user.email} ${action} successfully in the DB!`);
          if (!isNew) {
            res.status(HttpStatus.CONFLICT)
                .json({
                  data: false,
                  // eslint-disable-next-line max-len
                  error: 'You have already created your account - check your mailbox for activation instructions.'} );
          } else {
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
          }
        }).catch((dbErr) => {
          const {verified, err} = dbErr;
          if (verified) {
            res.status(HttpStatus.PRECONDITION_FAILED)
                .json({
                  data: false,
                  // eslint-disable-next-line max-len
                  error: 'You have already created your account.'} );
          } else {
            logger.error(`User ${email} COULD NOT be saved to the DB: ` +
              JSON.stringify(err));
            res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .json({data: false, error: err});
          }
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
    const error = 'Missing or invalid email';
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

module.exports = {
  postSignin,
  postJoin,
  postForgot,
  postForgotToken,
};
