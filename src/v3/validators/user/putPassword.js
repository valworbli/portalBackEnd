const Const = require('../../defs/const');
const Joi = require('joi');

module.exports = {
  validate: {
    body: {
      password: Joi.string().required(),
      token: Joi.string().length(Const.RESET_TOKEN_LENGTH)
          .error(() => 'Invalid token').required(),
    },
  },
};
