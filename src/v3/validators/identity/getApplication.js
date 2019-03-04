const Joi = require('joi');

module.exports = {
  validate: {
    body: {
      password: Joi.string().regex(
          /^(?=.*[a-z])(?=.*\d|.*[!@#$%^&*])(?=.*[A-Z])(?:.{8,})$/).required(),
      token: Joi.string().length(32).required(),
    },
  },
};
