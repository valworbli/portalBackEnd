const Joi = require('joi');
const regex =
/^Bearer [a-zA-Z0-9]{32}$/;

module.exports = {
  validate: {
    headers: {
      authorization: Joi.string().regex(regex)
          .error(() => 'Invalid token').required(),
    },
  },
};
