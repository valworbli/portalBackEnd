const Joi = require('joi');

module.exports = {
  validate: {
    headers: {
      authorization: Joi.string().length(39).required(),
    },
  },
};
