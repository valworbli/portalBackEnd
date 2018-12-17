const unirest = require('unirest');

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
              reject('fetch data error');
            }
          });
    });
  } catch (err) {
    console.log(`jwt expires. ${err}`); // eslint-disable-line no-console
  }
}

module.exports = {
  fetchData,
};
