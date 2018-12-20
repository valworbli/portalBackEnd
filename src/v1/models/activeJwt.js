const mongoose = require('mongoose');

const activeJwtSchema = new mongoose.Schema({
  email: {type: String},
  token: {type: String},
});

module.exports = mongoose.model('activeJwt', activeJwtSchema);
