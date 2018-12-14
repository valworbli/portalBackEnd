const {JsonRpc} = require('eosjs');
const fetch = require('node-fetch');
const rpc = new JsonRpc('https://endpoint-1.worbli.io', {fetch});

const AWS = require('aws-sdk');
AWS.config.update({
  'accessKeyId': process.env.AWS_ACCESS_KEY_ID,
  'secretAccessKey': process.env.AWS_SECRET_ACCESS_KEY,
  'region': 'us-east-1',
});
const sqs = new AWS.SQS({apiVersion: '2012-11-05'});

/**
 * Create Account
 * @param {string} data - Data.
 * @return {string} data.MessageId - The SQS Message ID
 */
function createAccount(data) {
  try {
    return new Promise(function(resolve, reject) {
      if (data &&
        data.worbli_account_name &&
        data.public_key_active &&
        data.public_key_owner) {
        const accountRequest = data;
        const params = {
          MessageBody: JSON.stringify(accountRequest),
          QueueUrl: process.env.SQS_QUEUE,
        };
        sqs.sendMessage(params,
            function(err, data) {
              if (err) {
                reject('Error', err);
              } else {
                resolve(data.MessageId);
              }
            });
      }
    });
  } catch (err) {
    console.log(`create account. ${err}`); // eslint-disable-line no-console
  }
}

/**
 * Check Exists
 * @param {string} worbliAccountName - The Worbli account name to check.
 * @return {boolean} true/false - Does the name already exist
 */
function checkExists(worbliAccountName) {
  try {
    return new Promise((resolve, reject) => {
      rpc.get_account(worbliAccountName)
          .then((data) => resolve(true))
          .catch((err) => resolve(false));
    });
  } catch (err) {
    console.log(`check exists. ${err}`); // eslint-disable-line no-console
  }
}

module.exports = {
  createAccount,
  checkExists,
};
