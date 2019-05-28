const crypto = require('crypto');
const HttpStatus = require('http-status-codes');
const bufferEq = require('buffer-equal-constant-time');
const logger = require('../components/logger')(module);

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
      logger.info('Received a PULL request: ' + JSON.stringify(obj));
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
