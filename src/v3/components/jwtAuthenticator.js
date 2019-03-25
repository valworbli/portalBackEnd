const HttpStatus = require('http-status-codes');
const Users = require('../models/schemas/users');
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
      // eslint-disable-next-line max-len
      // const jwtToken = jwt.jwtDecode('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImZ0cGRAZnRwZC5iaXoiLCJpYXQiOjE1NTM1MDMyNzAsImV4cCI6MTU1Mzc2MjQ3MH0.whejiTlq_IyGnryfu2dg00jyfCghH_5x4d-RSCCEInk');

      req.worbliUser = jwtToken;
      if (options.getDBID || options.getUser) {
        Users.findOne({email: req.worbliUser.email}, function(err, user) {
          if (err || !user) {
            throw (new Error('User DB ID could not be retrieved.'));
          } else {
            if (options.getDBID) {
              req.worbliUser._id = '' + user._id;
            }
            if (options.getUser) {
              req.worbliUser.user = user;
              req.worbliUser._id = '' + user._id;
            }
          }
          next();
        });
      } else {
        next();
      }
    } catch (err) {
      res.status(HttpStatus.UNAUTHORIZED)
      // eslint-disable-next-line max-len
          .json({data: false, error: 'Authentication failed: credentials wrong or missing.'});
    }
  };
};
