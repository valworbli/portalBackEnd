const {JsonRpc} = require('eosjs');
const fetch = require('node-fetch');
const rpc = new JsonRpc('https://api.worbli.io', {fetch});
const logger = require('../components/logger')(module);
const HttpStatus = require('http-status-codes');
const Users = require('../models/users');

const AWS = require('aws-sdk');
AWS.config.update({
  'accessKeyId': process.env.AWS_ACCESS_KEY_ID,
  'secretAccessKey': process.env.AWS_SECRET_ACCESS_KEY,
  'region': 'us-east-1',
});
// 1 const sqs = new AWS.SQS({apiVersion: '2012-11-05'});

/**
 * INTERNAL check
 * @param {string} accountName - The Worbli account name to check.
 * @return {Promise} a Promise with the result - err is not null on 500
 */
function _checkAccountName(accountName) {
  return new Promise(function(resolve, reject) {
    try {
      rpc.get_account(accountName)
          .then((data) => {
            resolve();
          }).catch((err) => {
            reject(undefined);
          });
    } catch (err) {
      logger.error('getCheck ' + JSON.stringify(err));
      reject('Internal error, please try again later');
    }
  });
}

/**
 * POST network/account
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 */
function postAccount(req, res) {
  try {
    // 2 const {accountName, publicKeyActive, publicKeyOwner} = req.body;
    const {accountName} = req.body;
    const {email} = req.worbliUser;

    _checkAccountName(accountName)
        .then(function() {
          res.status(HttpStatus.BAD_REQUEST)
              .json({
                data: false,
                // eslint-disable-next-line max-len
                error: 'The requested account name is not available. Please choose another one.',
              });
        }).catch(function(err) {
          Users.createNetworkAccount(email, accountName)
              .then(function(user) {
                res.status(HttpStatus.OK).json({data: true});
                // 3 try {
                //   sqs.sendMessage({
                //     MessageBody: JSON.stringify({
                //       worbli_account_name: accountName,
                //       public_key_active: publicKeyActive,
                //       public_key_owner: publicKeyOwner,
                //       email,
                //     }),
                //     QueueUrl: process.env.SQS_QUEUE,
                //   },
                //   function(err, data) {
                //     if (err) {
                //       res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                //           .json({data: false,
                // eslint-disable-next-line max-len
                //             error: 'Creating the network account failed, please try again later'});
                //     } else {
                //       res.status(HttpStatus.OK).json({data: true});
                //     }
                //   });
                // } catch (err) {
                //   res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                //       .json({data: false,
                //         // eslint-disable-next-line max-len
                // eslint-disable-next-line max-len
                //         error: 'Creating the network account failed, please try again later'});
                // }
              }).catch(function(err) {
                const {internal, error} = err;
                if (internal) {
                  res.status(HttpStatus.INTERNAL_SERVER_ERROR);
                } else {
                  res.status(HttpStatus.BAD_REQUEST);
                }

                res.json({data: false, error: error});
              });
        });
  } catch (err) {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({
          data: false,
          // eslint-disable-next-line max-len
          error: 'Creating the network account failed, please try again later',
        });
  }
}

/**
 * GET network/check
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 * @property {string} accountName - The Worbli account name to check.
 */
function getCheck(req, res) {
  const {accountName} = req.params;

  logger.info('getCheck CHECKING ' + JSON.stringify(accountName));
  logger.info(JSON.stringify(rpc));

  _checkAccountName(accountName)
      .then(function() {
        res.status(HttpStatus.OK).json({data: true});
      }).catch(function(err) {
        if (err) {
          res.status(HttpStatus.INTERNAL_SERVER_ERROR)
              .json({data: false, error: err});
        } else {
          res.status(HttpStatus.OK).json({data: false});
        }
      });
}

module.exports = {
  postAccount,
  getCheck,
};
