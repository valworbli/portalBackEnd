const Joi = require('joi');
const regex =
/^Bearer [A-Za-z0-9-=]+.[A-Za-z0-9-=]+.?[A-Za-z0-9-_=]*$/;

module.exports = {
  validate: {
    headers: {
      authorization: Joi.string().regex(regex)
          .error(() => 'Invalid token').required(),
    },
    params: {
      accountName: Joi.string()
          .regex(/^(?!.*?worbli)[a-z1-5]{6,12}$/).required(),
    },
  },
};
