const Joi = require('joi');

module.exports = {
  validate: {
    body: {
      email: Joi.string().lowercase().email({minDomainAtoms: 2}).required(),
      password: Joi.string().regex(
          /^(?=.*[a-z])(?=.*\d|.*[!@#$%^&*])(?=.*[A-Z])(?:.{8,})$/).required(),
      agreedTerms: Joi.boolean().valid(true).required(),
      agreedMarketing: Joi.boolean().required(),
      // token: Joi.string().length(32).required(),
    },
  },
};
