const mongoose = require('mongoose');

const sharegrabRequestSchema = new mongoose.Schema({
  owner: {type: String, required: true, index: true},
  security_code: {type: String, required: true, index: true},
  worbli_account_name: {type: String},
  state: {type: String},
  message: {type: String},
  date_inserted: {type: Date, require: true, default: Date.now},
});

module.exports = mongoose.models.sharegrab_request ||
mongoose.model('sharegrab_request', sharegrabRequestSchema);
