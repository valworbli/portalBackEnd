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
      accountName: Joi.string().lowercase().regex(
          /^(?!.*?worbli)[a-z1-5]{6,12}$/).required(),
      publicKeyActive: Joi.string().regex(/^EOS[A-Za-z0-9]{50}$/).required(),
      publicKeyOwner: Joi.string().regex(/^EOS[A-Za-z0-9]{50}$/).required(),
    },
  },
};
