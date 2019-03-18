const Const = require('../../defs/const');
const Joi = require('joi');

module.exports = {
  validate: {
    body: {
      token: Joi.string().length(Const.VERIFY_TOKEN_LENGTH)
          .error(() => 'Invalid token').required(),
    },
  },
};
