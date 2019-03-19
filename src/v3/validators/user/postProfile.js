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
      // password: Joi.string().regex(
      // eslint-disable-next-line max-len
      //     /^(?=.*[a-z])(?=.*\d|.*[!@#$%^&*])(?=.*[A-Z])(?:.{8,})$/).required(),
      // email: Joi.string().lowercase().email({minDomainAtoms: 2}).required(),
      password: Joi.string().required(),
      newPassword: Joi.string().required(),
    },
  },
};
