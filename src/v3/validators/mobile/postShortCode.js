const Joi = require('joi');

module.exports = {
  validate: {
    body: {
      shortcode: Joi.number().min(100000).max(1000000)
          .error(() => 'Invalid shortcode').required(),
    },
  },
};
