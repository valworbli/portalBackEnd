const Const = require('../../defs/const');
const Joi = require('joi');

module.exports = {
  validate: {
    query: {
      token: Joi.string().length(Const.VERIFY_TOKEN_LENGTH).required(),
    },
  },
};
