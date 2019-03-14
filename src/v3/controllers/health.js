const HttpStatus = require('http-status-codes');
const jwt = require('../components/jwt');
const Health = require('../models/schemas/health');

const healthToken = new Health({
  token: 'DoNotTrustHardcodedTokens',
});

/**
 * Kubernetes' Ready call
 * https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-probes/
 * expects a JWT in the Authentication header
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 */
function getReady(req, res) { // eslint-disable-line
  const token = jwt.jwtExtract(req);

  if (token && jwt.jwtDecode(token)) {
    res.status(HttpStatus.OK).json({data: true});
  } else {
    res.status(HttpStatus.UNAUTHORIZED)
        .json({data: false, error: 'User authentication failed'});
  }
}

/**
 * Kubernetes' Live call
 * Inserts a record in the DB, reads it back and only then OK's the call
 * https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-probes/
 * expects a JWT in the Authentication header
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 */
function getLive(req, res) { // eslint-disable-line
  // insert a record in the DB
  // get that record's ID and make some checks
  // if everything is fine then return OK
  const token = jwt.jwtExtract(req);

  if (token && jwt.jwtDecode(token)) {
    const randomToken = healthToken.initToken();

    healthToken.save(function(err, data) {
      if (err) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({data: false, err});
      } else {
        Health.findOne({token: randomToken}, function(err, hToken) {
          if (hToken && hToken.token === randomToken) {
            Health.deleteOne({token: randomToken}, function(err) {
              res.status(HttpStatus.OK).send('OK');
            });
          } else {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .json({data: false, err});
          }
        });
      }
    });
  } else {
    res.status(HttpStatus.UNAUTHORIZED)
        .json({data: false, error: 'User authentication failed'});
  }
}

module.exports = {
  getReady,
  getLive,
};
