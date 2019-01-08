const jwt = require('../components/jwt.js');
const loggerModel = require('../models/log.js');

/**
 * Logger
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 * @property {string} req.headers.authorization - The bearer token.
 */
function postLog(req, res) {
  try {
    const token = req.body.token;
    const data = req.body.data || {};
    const browser = req.body.browser;
    const createdAt = req.body.created_at;
    const from = 'front end';
    const action = req.body.action;
    if (token) {
      jwt.jwtDecode(token)
          .then((jwtData) => {
            if (jwtData && jwtData.email) {
              const email = jwtData.email;
              data.jwt_token = token;
              data.jwt_data = jwtData;
              const strData = JSON.stringify(data);
              return saveLog({
                email,
                data: strData,
                browser,
                created_at: createdAt,
                action,
                from,
              });
            }
          })
          .then((data) => {
            res.status(200).json({data: true});
          })
          .catch((err) => {
            res.status(400).json({data: false, error: err});
          });
    } else if (data && data.email) {
      const email = data.email;
      const strData = JSON.stringify(data);
      saveLog({
        email,
        data: strData,
        browser,
        created_at: createdAt,
        action,
        from,
      })
          .then(() => {
            res.status(200).json({data: true});
          })
          .catch((err) => {
            res.status(400).json({data: false, error: err});
          });
    } else {
      res.status(400).json({data: false});
    }
  } catch (err) {
    const error = 'logger post log failed';
    res.status(400).json({data: false, error});
  }
}

/**
 * Save
 * @param {data} data - The incoming request.
 * @return {data} req - The incoming request.
 */
function saveLog(data) {
  try {
    return new Promise(function(resolve, reject) {
      loggerModel(data).save((err, data) => {
        if (!err && data) {
          resolve();
        } else {
          reject();
        }
      });
    });
  } catch (err) {
    console.log('save log failed'); // eslint-disable-line no-console
  }
}

module.exports = {
  postLog,
};
