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
  dump: {type: String, required: true},
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
  dump: {type: String, required: true},
});

onFidoChecks.methods.addReport = function(ofReport) {
  for (const rep of this.reports) {
    if (rep.onfido_id === ofReport.id) {
      return false;
    }
  }

  const report = {
    name: ofReport.name,
    onfido_id: ofReport.id,
    created_at: ofReport.created_at,
    href: ofReport.href,
    status: ofReport.status,
    result: ofReport.result,
    sub_result: ofReport.sub_result,
    variant: ofReport.variant,
    dump: JSON.stringify(ofReport),
  };

  this.reports.push(report);

  return true;
};

onFidoChecks.methods.populate = function(ofCheck) {
  this.onfido_id = ofCheck.id;
  this.created_at = ofCheck.created_at;
  this.href = ofCheck.href;
  this.status = ofCheck.status;
  this.result = ofCheck.result;
  this.download_uri = ofCheck.download_uri;
  this.results_uri = ofCheck.results_uri;
  this.check_type = ofCheck.type;
  this.dump = JSON.stringify(ofCheck);
};

module.exports = mongoose.models.onfidochecks ||
mongoose.model('onfidochecks', onFidoChecks);
