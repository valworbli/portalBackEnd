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
  onfido.createApplicant()
      .then((data) => {
        const onfido_id = data;
        const email = req.body.email;
        const agreed_terms = req.body.agreed_terms;
        const agreed_marketing = req.body.agreed_marketing;
        logger.log('create aplicant id', email, {data});
        userModel.find({email},(err, data) => {
          if (!err && data && data[0] && data[0]._id) {
            const email = data[0].email;
            const onfido_status = data[0].onfido_status;
            const onfido_id = data[0].onfido_id;
            const newjwt = jwt.jwtExpires({email, onfido_status, onfido_id}, '72h');
            emailSender.sendEmail(email, newjwt, 'authorize')
                .then(() => res.status(200).json({data: true}))
                .catch(() => res.status(400).json({data: false}));
          } else {
            const onfido_status = 'default';
            const security_code = bigInt(Buffer.from(crypto.randomBytes(8)).toString('hex'), 16);
            userModel({email, agreed_terms, agreed_marketing, onfido_status, onfido_id, security_code}).save((err, data) => {
              if (!err && data) {
                const mongo_id = data._id;
                const newjwt = jwt.jwtSign({email, onfido_status, onfido_id});
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
        console.log(err);
      });
}

/**
 * Set Applicant
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 * @property {string} req.headers.authorization - The bearer token.
 */
function postReset(req, res) {
  const email = req.body.email;
  userModel.find({email}, (err, data) => {
    if (!err && data && data[0] && data[0]._id) {
      const mongo_id = data[0]._id;
      const email = data[0].email;
      const onfido_status = data[0].onfido_status;
      const newjwt = jwt.jwtExpires({email, mongo_id, onfido_status}, '72h');
      emailSender.sendEmail(email, newjwt, 'reset')
          .then(() => res.status(200).json({data: true}))
          .catch(() => res.status(400).json({data: false}));
    } else {
      res.status(200).json({data: true});
    }
  });
}

module.exports = {postAuthorize, postReset};
