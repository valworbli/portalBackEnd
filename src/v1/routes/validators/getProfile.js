const Joi = require('joi');
const regex =
/^Bearer [a-zA-Z0-9]{1,}[\\.][a-zA-Z0-9]{1,}[\\.][a-zA-Z0-9-_]{1,}$/;

module.exports = {
  validate: {
    headers: {
      authorization: Joi.string().regex(regex)
          .min(6)
          .error(() => 'Invalid Authorization Key'),
    },
  },
};
