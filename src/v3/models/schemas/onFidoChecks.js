const mongoose = require('mongoose');

const Reports = new mongoose.Schema({
  onfido_id: {type: String, required: true},
  created_at: {type: Date, required: false},
  href: {type: String, required: false},
  status: {type: String, required: false},
  result: {type: String, required: false},
  sub_result: {type: String, required: false},
  name: {type: String, required: false},
  variant: {type: String, required: false},
});

const onFidoChecks = new mongoose.Schema({
  user: {type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true},
  onfido_id: {type: String, required: true},
  created_at: {type: Date, required: true},
  href: {type: String, required: true},
  status: {type: String, required: true},
  result: {type: String, required: true},
  download_uri: {type: String, required: true},
  results_uri: {type: String, required: true},
  check_type: {type: String, required: true},
  reports: [Reports],
});

module.exports = mongoose.models.onfidochecks ||
mongoose.model('onfidochecks', onFidoChecks);
