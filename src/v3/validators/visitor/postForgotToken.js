const Const = require('../../defs/const');
const Joi = require('joi');

module.exports = {
  validate: {
    body: {
      token: Joi.string().length(Const.RESET_TOKEN_LENGTH).required(),
    },
  },
};
