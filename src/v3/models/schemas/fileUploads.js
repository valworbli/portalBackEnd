const mongoose = require('mongoose');

const fileUploads = new mongoose.Schema({
  user: {type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true},
  created_at: {type: Date, required: true},
  fieldname: {type: String, required: true},
  onfido_id: {type: String, required: false},
  onfido_errored: {type: Boolean, required: false},
  onfido_dump: {type: String, required: false},
  s3_time: {type: Date, required: false},
  s3_filename: {type: String, required: false},
  s3_dump: {type: String, required: false},
  s3_errored: {type: Boolean, required: false},
});

module.exports = mongoose.models.fileuploads ||
mongoose.model('fileuploads', fileUploads);
