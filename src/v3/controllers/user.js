const Users = require('../models/users');
const dbUsers = require('../models/schemas/users');
const HttpStatus = require('http-status-codes');
const logger = require('../components/logger')(module);
const jwt = require('../components/jwt');
const emailSES = require('../components/email');

/**
 * GET user/profile
 * @param {string} req - The incoming request.
 * @param {string} res - The outgoing response.
 */
function getProfile(req, res) {
  const email = req.worbliUser.email;
  Users.getUserProfile(email).then(function(profile) {
    res.status(HttpStatus.OK).json({...profile, data: true});
  }).catch(function(err) {
    res.status(HttpStatus.BAD_REQUEST).json({data: true, error: err});
  });
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
  const email = req.worbliUser.email;
  const {password, newPassword} = req.body;

  Users.authenticateUser(email, password)
      .then(function(user) {
        if (user.verify_token) {
          res.status(HttpStatus.CONFLICT)
          // eslint-disable-next-line max-len
              .json({data: false, error: 'Please verify your email - check your mailbox for activation instructions.'});
        } else {
          const token = jwt.jwtWithExpiry({email}, '72h');
          if (user.reset_token) {
            user.reset_token = undefined;
          }

          user.password = newPassword;
          user.save(function(err, user) {
            res.status(HttpStatus.OK).json({data: true, jwt: token});
          });
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
    const {token} = req.body;
    if (token) {
      Users.verifyUser(req.connection.remoteAddress, token)
          .then(function(user) {
            const token = jwt.jwtWithExpiry({email: user.email}, '72h');
            res.status(HttpStatus.OK).json({data: true, jwt: token});
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

/**
 * POST user/verify
 * @param {string} req - The incoming request.
 * @param {string} res - The outgoing response.
 */
function postResendVerify(req, res) {
  try {
    const {email} = req.body;
    dbUsers.findOne({email: email}, function(err, user) {
      if (err) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .json({data: false,
              error: 'Internal error, please try again later'});
      } else {
        if (user) {
          if (user.verify_token) {
            emailSES.sendEmail(user.email, user.verify_token, 'register')
                .then((data) => {
                  const receipt = JSON.stringify(data);
                  logger.info(
                      // eslint-disable-next-line max-len
                      `Re-sent a VERIFY email to user ${user.email}, receipt ID: ${receipt}`);
                  res.status(HttpStatus.OK).json( {data: true} );
                }).catch((err) => {
                  // eslint-disable-next-line max-len
                  logger.error(`FAILED to resend a VERIFY email to ${user.email}: ${err}`);
                  res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                      .json({data: false, error: err});
                });
          } else {
            res.status(HttpStatus.PRECONDITION_FAILED)
            // eslint-disable-next-line max-len
                .json({data: false, error: 'The email address has already been verified'});
          }
        } else {
          res.status(HttpStatus.UNAUTHORIZED)
              .json({data: false, error: 'Please check the email address'});
        }
      }
    });
  } catch (err) {
    logger.error(`postResendVerify: ${err}`);
    res.status(HttpStatus.BAD_REQUEST).json({data: false});
  }
}

/**
 * PUT visitor/password
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 */
function putPassword(req, res) {
  try {
    const {password, token} = req.body;
    if (token) {
      Users.resetUser(req.connection.remoteAddress, token, password)
          .then(function(user) {
            const token = jwt.jwtWithExpiry({email: user.email}, '72h');
            res.status(HttpStatus.OK).json({data: true, jwt: token});
          }).catch(function(err) {
            const {reason, error} = err;
            logger.error(`error resetting the password of the user: ${error}`);
            if (reason === 'error' || reason === 'dbfailure') {
              res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                  .json({data: false,
                    error: 'Internal error, please try again later'});
            } else if (reason === 'authentication') {
              res.status(HttpStatus.UNAUTHORIZED)
                  .json({data: false, error: 'Wrong token provided'});
            }
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
  putPassword,
  postResendVerify,
};
