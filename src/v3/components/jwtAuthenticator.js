const HttpStatus = require('http-status-codes');
const jwt = require('./jwt');

// middleware that is specific to this router
module.exports = function(options) {
  return function decodeJWT(req, res, next) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const jwtToken = jwt.jwtDecode(token);
      if (!jwtToken) {
        throw (new Error('Token could not be decoded.'));
      }

      req.worbliUser = jwtToken;
      next();
    } catch (err) {
      res.status(HttpStatus.UNAUTHORIZED)
      // eslint-disable-next-line max-len
          .json({data: false, error: 'Authentication failed: credentials wrong or missing.'});
    }
  };
};
