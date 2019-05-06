const Joi = require('joi');
const regex =
/^Bearer [A-Za-z0-9-=]+.[A-Za-z0-9-=]+.?[A-Za-z0-9-_=]*$/;

module.exports = {
  validate: {
    headers: {
      authorization: Joi.string().regex(regex)
          .error(() => 'Invalid token').required(),
    },
    body: {
      number: Joi.string().lowercase().regex(/^\+[0-9]{7,15}$/)
          .error(() => 'Invalid number').required(),
    },
  },
};
