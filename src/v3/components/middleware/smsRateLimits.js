/* eslint max-len: 0 */
const smsLogs = require('../../models/smsLogs');
const HttpStatus = require('http-status-codes');

// middleware that is specific to this router
module.exports = function(options = {}) {
  return function(req, res, next) {
    const {user} = req.worbliUser;

    smsLogs.isSMSAllowed(user._id).then(function(allowed) {
      if (allowed) {
        next();
      } else {
        throw new Error('dummy message');
      }
    }).catch(function(err) {
      res.status(HttpStatus.TOO_MANY_REQUESTS).json({
        data: false,
        error: 'Limit for sending SMS exceeded. Try again later or copy the link to your mobile.',
      });
    });
  };
};
