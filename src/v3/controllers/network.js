const {JsonRpc} = require('eosjs');
const fetch = require('node-fetch');
const rpc = new JsonRpc('https://api.worbli.io', {fetch});
const logger = require('../components/logger')(module);
const HttpStatus = require('http-status-codes');

/**
 * POST network/account
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 */
function postAccount(req, res) {

}
/**
 * GET network/check
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 * @property {string} worbliAccountName - The Worbli account name to check.
 */
function getCheck(req, res) {
  const {accountName} = req.body;

  logger.info('getCheck CHECKING ' + JSON.stringify(accountName));
  logger.info(JSON.stringify(rpc));

  try {
    rpc.get_account(accountName)
        .then((data) => {
          // eslint-disable-next-line max-len
          logger.info('getCheck SUCCESS rpc_get_account returned ' + JSON.stringify(data));
          res.status(HttpStatus.OK).json({data: true});
        }).catch((err) => {
          // eslint-disable-next-line max-len
          logger.error('getCheck ERROR rpc_get_account returned ' + JSON.stringify(err));
          res.status(HttpStatus.NOT_FOUND).json({data: false});
        });
  } catch (err) {
    logger.error(`getCheck ${err}`);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({data: false, error: 'Internal error, please try again later'});
  }
}

module.exports = {
  postAccount,
  getCheck,
};
