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
      country: Joi.string().length(3).uppercase()
          .error(() => 'Invalid country provided').required(),
      files: Joi.string().error(() => 'Invalid fields provided').required(),
    },
  },
};
