const crypto = require('crypto');
const HttpStatus = require('http-status-codes');
const bufferEq = require('buffer-equal-constant-time');
const logger = require('../components/logger')(module);
const request = require('request');
const parse = require('parse-diff');

const {JsonRpc} = require('eosjs');
const fetch = require('node-fetch');

const AWS = require('aws-sdk');
AWS.config.update({
  'accessKeyId': process.env.SES_ACCESS_KEY_ID,
  'secretAccessKey': process.env.SES_SECRET_ACCESS_KEY,
  'region': process.env.SES_REGION,
});

/**
 * Internal sign
 * @param {string} data - The data to sign.
 * @return {string} The signed data.
 */
function sign(data) {
  const enc = 'sha1=' + crypto.createHmac('sha1', process.env.GITHUB_SECRET).
      update(data).digest('hex');
  logger.info('SIGNed to ' + JSON.stringify(enc));

  return enc;
}

/**
 * Internal verify
 * @param {string} signature - The signature from the x-hub-signature header.
 * @param {string} data - The POSTed data.
 * @return {boolean} whether the signature and the encoded data match.
 */
function verify(signature, data) {
  return bufferEq(Buffer.from(signature), Buffer.from(sign(data)));
}

/**
 * Internal sendEmail
 * @param {string} email - The email address to send to.
 * @param {string} pubEndSucceeded - Whether the public endpoint verification succeeded.
 * @param {string} jsonSucceeded - Whether parsing the endpoints.json to JSON was successful.
 * @param {string} prNumber - The number of the pull request.
 * @param {string} prUrl - The Github url of the pull request.
 * @param {string} prUserLogin - The name of the user submitting the PR.
 * @param {string} prUserUrl - The Github url of the user.
 * @param {string} pubEndpoint - The public endpoint from the added data.
 * @return {string} SES Receipt ID.
 */
function sendEmail(email, pubEndSucceeded, jsonSucceeded, prNumber, prUrl, prUserLogin, prUserUrl, pubEndpoint) {
  try {
    return new Promise(function(resolve, reject) {
      let suffix = '';
      let pubEndSuffix = pubEndSucceeded ? 'SUCCESS' : 'FAILED';
      let jsonSuffix = jsonSucceeded ? 'SUCCESS' : 'FAILED';

      if ((pubEndSucceeded & jsonSucceeded) === 0) {
        if (pubEndSucceeded || jsonSucceeded) {
          suffix = 'PARTIALLY VERIFIED';
        } else {
          suffix = 'VERIFY FAILED';
        }
      } else {
        suffix = 'VERIFIED';
      }

      let title = '[WORBLI] Push request for publicEndpoints ' + suffix;
      let htmlEmail = `
          <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
          <html xmlns="http://www.w3.org/1999/xhtml">
            <head>
              <meta 
                http-equiv="Content-Type" 
                content="text/html; 
                charset=UTF-8" 
              />
              <title>
              [WORBLI] Push request for publicEndpoints
              </title>
              <meta 
                name="viewport" 
                content="width=device-width, 
                initial-scale=1.0"
              />
            </head>
            <body 
              style="margin: 0; 
              padding: 0; 
              background-color: #F7F7F7; 
              min-height: 100vh"
              >
            <table 
              style="margin: 0; padding: 60px; background-color: #F7F7F7;" 
              cellpadding="0" 
              cellspacing="0" 
              width="100%">
              <tr>
              <td style="text-align:center">
                <img src="https://d1r0t58ow9lja0.cloudfront.net/email-logo.png" width="200px" style="margin-bottom: 20px;">
                <table style="margin: 0; 
                  padding: 60px; 
                  background-color: #FFFFFF; 
                  text-align:left; 
                  border-radius: 0.4em;" 
                  cellpadding="0" 
                  cellspacing="0" 
                  width="100%">
                <tr>
                  <td><b>Push request for publicEndpoints #${prNumber}</b></td>
                </tr>  
                <tr>
                  <td>
                  </br></br>
                    <p>Push request for publicEndpoints:</p>
                    <p>  Public endpoint: ${pubEndpoint}</p>
                    <p>  Public endpoint: ${pubEndSuffix}</p></br></br>
                    <p>  JSON parsed: ${jsonSuffix}</p></br></br>
                    <p>  <hr width="100%">
                    <p>  PR url: ${prUrl}</p></br></br>
                    <p>  Submitted by: ${prUserLogin}</p></br></br>
                    <p>  Submitter url: ${prUserUrl}</p>
                  </td>
                  </tr>
                </table>
              </td>
              </tr>
            </table>
            </body>
          </html>
        `;
      const params = {
        Destination: {ToAddresses: [email]},
        Message: {
          Body: {
            Html: {
              Charset: 'UTF-8',
              Data: htmlEmail,
            },
          },
          Subject: {Charset: 'UTF-8', Data: title},
        },
        Source: 'WORBLI <do-not-reply@worbli.io>',
        ReplyToAddresses: ['WORBLI <do-not-reply@worbli.io>'],
      };
      const sendPromise = new AWS.SES({
        apiVersion: '2010-12-01',
      }).sendEmail(params).promise();
      sendPromise
          .then((data) => {
            logger.info('Notified ' + process.env.PR_EMAIL + ' about the PR');
            resolve(data);
          })
          .catch((err) => {
            reject(err);
          });
    });
  } catch (err) {
    console.log(`send email. ${err}`); // eslint-disable-line no-console
  }
}

/**
 * 
 * @param {string} url - the URL from which to obtain the endpoints.json file
 * @return {boolean} - whether the JSON parsing succeeded
 */
async function _verifyEndpointsJSON(url) {
  let res = await new Promise(function(resolve, reject) {
    request(url, function(error, response, body) {
      if(!error && response.statusCode === HttpStatus.OK) {
        try {
          JSON.parse(body);
          logger.info('_verifyEndpointsJSON: SUCCESS parsing the endpoints.json file');
          resolve(true);
        } catch(err) {
          logger.info('_verifyEndpointsJSON: ERROR parsing the endpoints.json file: ' + JSON.stringify(err));
          reject(err);
        }
      } else {
        logger.info('_verifyEndpointsJSON 1: Error fetching the URL ' + url + ': ' + JSON.stringify(error));
        reject(error);
      }
    });
  }).catch(function(err) {
    logger.error('_verifyEndpointsJSON 2: Error fetching the URL ' + url + ': ' + JSON.stringify(err));
  });

  if (res === undefined)
    res = false;

  return res;
}

/**
 * POST /github/webhook - accepts Github webhook calls
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 * @return {object} the response
 */
function postWebhook(req, res) {
  const sig = req.headers['x-hub-signature'];
  const event = req.headers['x-github-event'];
  const id = req.headers['x-github-delivery'];

  let obj = undefined;

  if (!verify(sig, JSON.stringify(req.body))) {
    logger.error('Error VERIFYING the data');
    return res.status(HttpStatus.BAD_REQUEST).
        json({error: 'Error verifying the data'});
  }

  try {
    obj = req.body;
    if (event !== 'pull_request') {
      logger.warn('Github sent us an event ' + JSON.stringify(event) +
        ' with ID ' + JSON.stringify(id) +
        ' we do not support: ' + JSON.stringify(obj));
    } else {
      // logger.info('Received a PULL request: ' + JSON.stringify(obj));
      var prNumber = obj.pull_request.number;
      var prUrl = obj.pull_request.html_url;
      var prDiffUrl = obj.pull_request.diff_url;
      var prUserLogin = obj.pull_request.user.login;
      var prUserUrl = obj.pull_request.user.html_url;
      var endpointsUrl = obj.pull_request.head.repo.html_url + '/raw/' + obj.pull_request.head.ref + '/endpoints.json';
      let jsonSucceeded = _verifyEndpointsJSON(endpointsUrl);

      request(prDiffUrl, function(error, response, body) {
        if (error) {
          logger.error('postWebhook: Error getting the diff of the PR: ' + JSON.stringify(error));
        } else {
          if (response) {
            if (response.statusCode !== HttpStatus.OK) {
              logger.error('postWebhook: Error response obtained trying to get the diff of the PR:');
              logger.error('    status: ' + JSON.stringify(response.statusCode));
              logger.error('    message: ' + JSON.stringify(message.statusMessage));
            } else {
              logger.info('GOT THIS DIFF: ' + body);
              var files = parse(body);
              logger.info('Parsed ' + JSON.stringify(files.length) + ' affected files');
              files.forEach(function(file) {
                logger.info(file.chunks.length); // number of hunks
                logger.info(file.chunks[0].changes.length) // hunk added/deleted/context lines
                file.chunks[0].changes.forEach(function(change) {
                  if (change.add) {
                    if (change.content.indexOf('apiEndpoint') > -1) {
                      let urls = change.content.match(/\bhttps?:\/\/\S+/gi);
                      if (urls && urls.length > 0) {
                        let url = urls[0].split('\"').join('').split(',').join('');
                        logger.info('    Obtained the apiEndpoint: ' + JSON.stringify(url));
                        const rpc = new JsonRpc(url, {fetch});
                        rpc.get_info().then((data) => {
                          logger.info('            get_info SUCCESS' + JSON.stringify(data));
                          sendEmail(process.env.PR_EMAIL, true, jsonSucceeded, prNumber, prUrl, prUserLogin, prUserUrl, url);
                        }).catch((err) => {
                          logger.info('            get_info ERROR' + JSON.stringify(err));
                          sendEmail(process.env.PR_EMAIL, false, jsonSucceeded, prNumber, prUrl, prUserLogin, prUserUrl, url);
                        });

                      } else {
                        logger.error('postWebhook: No url specified for the public endpoint: ' + JSON.stringify(change.content));
                      }
                    }
                  }
                });
              });
            }
          }
        }
      });
    }
  } catch (err) {
    logger.error('Error PARSING the data: ' + JSON.stringify(err));
    return res.status(HttpStatus.BAD_REQUEST).
        json({error: 'Error parsing the data'});
  }

  return res.status(HttpStatus.OK).json({ok: true});
}

module.exports = {
  postWebhook,
};
