const Joi = require('joi');

module.exports = {
  validate: {
    query: {
      account: Joi.string().required(),
    },
  },
};
