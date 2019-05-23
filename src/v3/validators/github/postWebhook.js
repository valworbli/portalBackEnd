const Joi = require('joi');

module.exports = {
  validate: {
    headers: {
      'x-hub-signature': Joi.string()
          .error(() => 'Missing required header').required(),
      'x-github-event': Joi.string()
          .error(() => 'Missing required header').required(),
      'x-github-delivery': Joi.string()
          .error(() => 'Missing required header').required(),
    },
  },
};
