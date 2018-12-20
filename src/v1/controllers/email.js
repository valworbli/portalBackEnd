const userModel = require('../models/user.js');
const jwt = require('../components/jwt.js');
const emailSender = require('../components/email.js');
const logger = require('../components/logger.js');
const onfido = require('../components/onfido.js');
const bigInt = require('big-integer');
const crypto = require('crypto');

/**
 * Set Applicant
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 * @property {string} req.headers.authorization - The bearer token.
 */
function postAuthorize(req, res) {
  try {
    onfido.createApplicant()
        .then((data) => {
          const onfidoId = data;
          const email = req.body.email;
          const agreedTerms = req.body.agreed_terms;
          const agreedMarketing = req.body.agreed_marketing;
          logger.log('create aplicant id', email, {data});
          userModel.find({email}, (err, data) => {
            if (!err && data && data[0] && data[0]._id) {
              const email = data[0].email;
              const onfidoStatus = data[0].onfido_status;
              const onfidoId = data[0].onfido_id;
              const newjwt = jwt.jwtExpires({
                email,
                onfido_status: onfidoStatus,
                onfido_id: onfidoId,
              }, '72h');
              emailSender.sendEmail(email, newjwt, 'authorize')
                  .then(() => res.status(200).json({data: true}))
                  .catch(() => res.status(400).json({data: false}));
            } else {
              const onfidoStatus = 'default';
              const securityCode = bigInt(
                  Buffer.from(crypto.randomBytes(8)).toString('hex'), 16
              );
              userModel({
                email,
                agreed_terms: agreedTerms,
                agreed_marketing: agreedMarketing,
                onfido_status: onfidoStatus,
                onfido_id: onfidoId,
                security_code: securityCode,
              }).save((err, data) => {
                if (!err && data) {
                  const newjwt = jwt.jwtSign({
                    email,
                    onfido_status: onfidoStatus,
                    onfido_id: onfidoId});
                  jwt.insertActiveJwt(email, newjwt);
                  emailSender.sendEmail(email, newjwt, 'authorize')
                      .then(() => res.status(200).json({data: true}))
                      .catch(() => res.status(400).json({data: false}));
                } else {
                  res.status(400).json({data: false});
                }
              });
            }
          });
        })
        .catch((err)=>{
          console.log(err); // eslint-disable-line no-console
        });
  } catch (err) {
    const error = 'email post authorize';
    res.status(400).json({data: false, error});
  }
}

/**
 * Set Applicant
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 * @property {string} req.headers.authorization - The bearer token.
 */
function postReset(req, res) {
  try {
    const email = req.body.email;
    userModel.find({email}, (err, data) => {
      if (!err && data && data[0] && data[0]._id) {
        const email = data[0].email;
        const onfidoStatus = data[0].onfido_status;
        const newjwt = jwt.jwtExpires({
          email,
          onfido_status: onfidoStatus,
        }, '72h');
        jwt.insertActiveJwt(email, newjwt);
        emailSender.sendEmail(email, newjwt, 'reset')
            .then(() => res.status(200).json({data: true}))
            .catch(() => res.status(400).json({data: false}));
      } else {
        res.status(200).json({data: true});
      }
    });
  } catch (err) {
    const error = 'email post reset';
    res.status(400).json({data: false, error});
  }
}

module.exports = {
  postAuthorize,
  postReset,
};
