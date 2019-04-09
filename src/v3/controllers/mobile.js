/* eslint max-len: 0 */
const HttpStatus = require('http-status-codes');
const logger = require('../components/logger')(module);
const Const = require('../defs/const.js');

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
  // const {user} = req.worbliUser;
  const {number, message} = req.body;

  sns.setSMSAttributes({attributes: {'DefaultSMSType': 'Transactional'}}).promise().then(function(data) {
    const params = {Message: message, PhoneNumber: number};
    logger.info('Successfully set the SMS attribute to Transactional: ' + JSON.stringify(data));

    sns.publish(params).promise().then(function(data) {
      logger.info('Sent an SMS to ' + JSON.stringify(number) + ': ' + JSON.stringify(data));
      res.status(HttpStatus.OK).json({data: true});
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
 * @property {string} accountName - The Worbli account name to check.
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
  // const {accountName} = req.params;

  // _checkAccountName(accountName)
  //     .then(function() {
  //       res.status(HttpStatus.OK).json({data: true});
  //     }).catch(function(err) {
  //       if (err) {
  //         res.status(HttpStatus.INTERNAL_SERVER_ERROR)
  //             .json({data: false, error: err});
  //       } else {
  //         res.status(HttpStatus.OK).json({data: false});
  //       }
  //     });
}

module.exports = {
  postSMS,
  getShortCode,
};
