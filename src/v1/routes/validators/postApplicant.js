const Joi = require('joi');

module.exports = {
  validate: {
    headers: {
      authorization: Joi.string().regex(/^Bearer [a-zA-Z0-9]{1,}[\.][a-zA-Z0-9]{1,}[\.][a-zA-Z0-9-_]{1,}$/).min(6).error(() => 'Invalid Authorization Key'),
    },
  },
};
