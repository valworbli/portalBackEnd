/* eslint max-len: 0 */
const HttpStatus = require('http-status-codes');
const logger = require('../components/logger')(module);
const Const = require('../defs/const.js');
const Users = require('../models/users');
const jwt = require('../components/jwt');
const SMSLog = require('../models/schemas/smsLog');
const AWS = require('aws-sdk');
AWS.config.update({
  'accessKeyId': process.env.SES_ACCESS_KEY_ID,
  'secretAccessKey': process.env.SES_SECRET_ACCESS_KEY,
  'region': process.env.SQS_REGION,
});

// TODO uncomment this after the tests
// const sns = new AWS.SNS({apiVersion: '2010-03-31'});

/**
 * POST mobile/sms
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 */
function postSMS(req, res) {
  const {user} = req.worbliUser;
  // TODO remove the following line and uncomment the next one after the tests
  // let {number, country, files} = req.body;
  const {number} = req.body;

  if (!user.shortcode) {
    const shortCode = randomIntFromInterval(Const.SHORTCODE_MIN, Const.SHORTCODE_MAX);
    user.shortcode = shortCode;
  }

  const myLink = `${process.env.FRONT_END_URL}/id/${user.shortcode}`;
  const message = `WORBLI: Tap this link to upload your photos: ${myLink}`;

  user.save(function(err, user) {
    if (err) {
      logger.error('Failed to save the user when sending the SMS: ' + JSON.stringify(err));
      res.status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({data: false, error: 'Failed to send out the SMS, please try again later'});
    } else {
      // TODO: uncomment these lines once the tests are done
      // sns.setSMSAttributes({attributes: {'DefaultSMSType': 'Transactional'}}).promise().then(function(data) {
      //   const params = {Message: message, PhoneNumber: number};
      //   logger.info('Successfully set the SMS attribute to Transactional: ' + JSON.stringify(data));

      // sns.publish(params).promise().then(function(data) {
      //   logger.info('Sent an SMS to ' + JSON.stringify(number) + ': ' + JSON.stringify(data));
      const smsLogEntry = new SMSLog({user, number, message});
      smsLogEntry.save(function(err, entry) {
        res.status(HttpStatus.OK).json({data: true, shortcode: user.shortcode, link: myLink});
      });
      // }).catch(function(err) {
      //   logger.error('Failed to send the SMS: ' + JSON.stringify(err));
      //   res.status(HttpStatus.INTERNAL_SERVER_ERROR)
      //       .json({data: false, error: 'Failed to send out the SMS, please try again later'});
      // });
      // }).catch(function(err) {
      //   logger.error('Failed to set the SMS type to Transactional: ' + JSON.stringify(err));
      //   res.status(HttpStatus.INTERNAL_SERVER_ERROR)
      //       .json({data: false, error: 'Failed to send out the SMS, please try again later'});
      // });
      // END TODO
    }
  });
}

/**
 * POST mobile/files
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 */
function postFiles(req, res) {
  const {user} = req.worbliUser;
  const {country, files} = req.body;

  user.shortcodeData = {files, country};

  logger.info('user.shortcodeData: ' + JSON.stringify(user.shortcodeData));
  user.save(function(err, user) {
    if (err) {
      logger.error('Failed to save the user when posting the mobile files: ' + JSON.stringify(err));
      res.status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({data: false, error: 'Failed to send out the SMS, please try again later'});
    } else {
      res.status(HttpStatus.OK).json({data: true});
    }
  });
}

/**
 * random integer generator, in a specific interval
 * @param {number} min - The minimum integer of the interval
 * @param {number} max - The maximum integer of the interval
 * @return {number} - the random integer in the specified interval
 */
function randomIntFromInterval(min=Const.SHORTCODE_MIN, max=Const.SHORTCODE_MAX) {
  return Math.floor(Math.random()*(max-min+1)+min);
}

/**
 * GET mobile/shortcode
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 */
function getShortCode(req, res) {
  const {user} = req.worbliUser;

  const shortCode = randomIntFromInterval(Const.SHORTCODE_MIN, Const.SHORTCODE_MAX);
  user.shortcode = shortCode;
  user.save(function(err, user) {
    if (err || !user) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({data: false, error: 'Failed to generate the short code, please try again later'});
    } else {
      res.status(HttpStatus.OK).json({data: true, shortcode: shortCode});
    }
  });
}

/**
 * POST mobile/shortcode
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 */
function postShortCode(req, res) {
  const {shortcode} = req.body;

  Users.findUserByShortCode(shortcode).then(function(user) {
    if (!user) {
      res.status(HttpStatus.BAD_REQUEST)
          .json({data: false, error: 'Failed to authenticate the short code'});
    } else {
      user.shortcode = undefined;

      user.save(function(err, user) {
        if (err) {
          res.status(HttpStatus.INTERNAL_SERVER_ERROR)
              .json({data: false, error: 'Failed to authenticate the short code, please try again later'});
        } else {
          if (!user) {
            res.status(HttpStatus.BAD_REQUEST)
                .json({data: false, error: 'Failed to authenticate the short code'});
          } else {
            const token = jwt.jwtWithExpiry({email: user.email}, '72h');
            res.status(HttpStatus.OK).json({data: true, jwt: token});
          }
        }
      });
    }
  }).catch(function(err) {
    logger.error('Error in POST /mobile/shortcode: ' + JSON.stringify(err));
    res.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({data: false, error: 'Failed to authenticate the short code, please try again later'});
  });
}

module.exports = {
  postSMS,
  postFiles,
  getShortCode,
  postShortCode,
};
