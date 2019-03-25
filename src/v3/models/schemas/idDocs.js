const mongoose = require('mongoose');

const idDocsSchema = new mongoose.Schema({
  code: {type: String, required: true, index: true, unique: true},
  name: {type: String, required: true, index: true, unique: true},
  accepted: {type: Array, required: true},
});

module.exports = mongoose.models.identity_documents ||
mongoose.model('identity_documents', idDocsSchema);
