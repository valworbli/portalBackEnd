const Joi = require('joi');

module.exports = {
  validate: {
    body: {
      email: Joi.string().lowercase().email({minDomainAtoms: 2}).required(),
      // password: Joi.string().regex(
      // eslint-disable-next-line max-len
      //     /^(?=.*[a-z])(?=.*\d|.*[!@#$%^&*])(?=.*[A-Z])(?:.{8,})$/).required(),
      password: Joi.string().required(),
      agreedTerms: Joi.boolean().valid(true).required(),
      agreedMarketing: Joi.boolean(),
      // token: Joi.string().length(32).required(),
    },
  },
};
