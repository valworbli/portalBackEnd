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
      firstName: Joi.string().required(),
      // middleName: Joi.string(),
      lastName: Joi.string().required(),
      country: Joi.string().required(),
      day: Joi.number().required(),
      month: Joi.number().required(),
      year: Joi.number().required(),
      gender: Joi.string().required(),
    },
  },
};
