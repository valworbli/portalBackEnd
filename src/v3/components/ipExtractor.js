// middleware that is specific to this router
module.exports = function(options = {}) {
  return function ipExtract(req, res, next) {
    try {
      let ip = req.headers['x-real-ip'];
      if (!ip) ip = req.headers['x-forwarded-for'];
      if (!ip) ip = req.connection.remoteAddress;

      if (options.useWorbliUser) {
        if (!req.worbliUser) req.worbliUser = {};
        req.worbliUser.ip = ip;
      } else {
        req.ip = ip;
      }
    } catch (err) {
      // do nothing
    }
    next();
  };
};
