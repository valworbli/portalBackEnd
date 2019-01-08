const Joi = require('joi');

module.exports = {
  validate: {
    body: {
      email: Joi.string().lowercase().email({minDomainAtoms: 2}).required(),
      agreed_terms: Joi.boolean().valid(true).required(),
      agreed_marketing: Joi.boolean().required(),
    },
  },
};
