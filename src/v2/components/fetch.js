const unirest = require('unirest');
const logger = require('../components/logger')(module);

/**
 * Status
 * @param {object} data - The http request parameters
 * @return {string} Sresponse.body - response from http request
 */
function fetchData(data) {
  try {
    return new Promise(function(resolve, reject) {
      const url = data.url;
      const method = data.method;
      const headers = data.headers;
      const body = data.body;
      unirest[method.toLowerCase()](url).headers(headers).send(body)
          .end((response) => {
            if (response && response.body) {
              resolve(response.body);
            } else {
              logger.error(`fetch error for  ${JSON.stringify(data)}`);
              reject('fetch data error');
            }
          });
    });
  } catch (err) {
    logger.error(`jwt expires. ${err}`);
  }
}

module.exports = {
  fetchData,
};
