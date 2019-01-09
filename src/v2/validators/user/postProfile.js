const Joi = require('joi');

module.exports = {
  validate: {
    body: {
      name_first: Joi.string().lowercase().min(1).max(35).required(),
      name_last: Joi.string().lowercase().max(35).required(),
      address_country: Joi.string().lowercase().max(3).required(),
      date_birth_day: Joi.number().required(),
      date_birth_month: Joi.number().required(),
      date_birth_year: Joi.number().required(),
      gender: Joi.string().lowercase().min(4).max(6).required(),
    },
  },
};
