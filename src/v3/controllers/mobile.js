/* eslint max-len: 0 */
const HttpStatus = require('http-status-codes');
const logger = require('../components/logger')(module);
const Const = require('../defs/const.js');
const Users = require('../models/users');
const jwt = require('../components/jwt');

const AWS = require('aws-sdk');
AWS.config.update({
  'accessKeyId': process.env.SES_ACCESS_KEY_ID,
  'secretAccessKey': process.env.SES_SECRET_ACCESS_KEY,
  'region': process.env.SQS_REGION,
});

const sns = new AWS.SNS({apiVersion: '2010-03-31'});

/**
 * POST mobile/sms
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 */
function postSMS(req, res) {
  const {user} = req.worbliUser;
  const {number, message, country, files} = req.body;

  user.shortcodeData = {files, country};
  user.save(function(err, user) {
    if (err) {
      logger.error('Failed to send the SMS!');
      res.status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({data: false, error: 'Failed to send out the SMS, please try again later'});
    } else {
      sns.setSMSAttributes({attributes: {'DefaultSMSType': 'Transactional'}}).promise().then(function(data) {
        const params = {Message: message, PhoneNumber: number};
        logger.info('Successfully set the SMS attribute to Transactional: ' + JSON.stringify(data));

        sns.publish(params).promise().then(function(data) {
          logger.info('Sent an SMS to ' + JSON.stringify(number) + ': ' + JSON.stringify(data));
          res.status(HttpStatus.OK).json({data: true, shortcode: user.shortcode});
        }).catch(function(err) {
          logger.error('Failed to send the SMS!');
          res.status(HttpStatus.INTERNAL_SERVER_ERROR)
              .json({data: false, error: 'Failed to send out the SMS, please try again later'});
        });
      }).catch(function(err) {
        logger.error('Failed to set the SMS type to Transactional!');
        res.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .json({data: false, error: 'Failed to send out the SMS, please try again later'});
      });
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
      const shortcodeData = {
        country: user.shortcodeData.country,
        files: user.shortcodeData.files.slice(0),
      };
      user.shortcode = undefined;
      user.shortcodeData = undefined;

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
            res.status(HttpStatus.OK).json({...shortcodeData, data: true, jwt: token});
          }
        }
      });
    }
  }).catch(function(err) {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({data: false, error: 'Failed to authenticate the short code, please try again later'});
  });
}

module.exports = {
  postSMS,
  getShortCode,
  postShortCode,
};
