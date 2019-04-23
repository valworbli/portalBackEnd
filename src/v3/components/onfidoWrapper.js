/* eslint max-len: 0 */
const OnFido = require('onfido');
const Const = require('../defs/const');

const defaultClient = OnFido.ApiClient.instance;
const api = new OnFido.DefaultApi();

// Configure API key authorization: Token
const tokenAuth = defaultClient.authentications['Token'];
tokenAuth.apiKey = 'token=' + process.env.ONFIDO_TOKEN;
tokenAuth.apiKeyPrefix = 'Token';

/**
 * Create an OnFido applicant
 * @param {string} user - A usersSchema object
 * @return {Promise} A Promise from the OnFido module
 */
function createApplicant(user) {
  const applicant = new OnFido.Applicant();
  applicant.first_name = user.name_first;
  applicant.middle_name = user.name_middle;
  applicant.last_name = user.name_last;
  applicant.dob = user.date_birth;
  applicant.country = user.address_country;
  // applicant.nationality = user.address_country;
  applicant.gender = user.gender;

  return api.createApplicant(applicant);
}

/**
 * Create a fake OnFido applicant
 * @return {Promise} A Promise from the OnFido module
 */
function createFakeApplicant() {
  const applicant = new OnFido.Applicant();
  applicant.first_name = 'Test';
  applicant.middle_name = 'Some';
  applicant.last_name = 'User';
  applicant.dob = new Date('1990-12-12T03:03:03');
  applicant.country = 'USA';
  // applicant.nationality = user.address_country;
  applicant.gender = 'male';

  return api.createApplicant(applicant);
}

/**
 * Updates an OnFido applicant
 * @param {string} user - A usersSchema object
 * @return {Promise} A Promise from the OnFido module
 */
function updateApplicant(user) {
  const applicant = new OnFido.Applicant();
  applicant.first_name = user.name_first;
  applicant.middle_name = user.name_middle;
  applicant.last_name = user.name_last;
  applicant.dob = user.date_birth;
  applicant.country = user.address_country;
  // applicant.nationality = user.address_country;
  applicant.gender = user.gender;

  return api.updateApplicant(user.onfido.onfido_id, applicant);
}

/**
 * Delete an OnFido applicant
 * @param {string} applicantId - The ID of the applicant
 * @return {Promise} A Promise from the OnFido module
 */
function deleteApplicant(applicantId) {
  return api.destroyApplicant(applicantId);
}

/**
 * Upload an image to an OnFido applicant
 * @param {string} applicantId - The ID of the applicant
 * @param {string} imageType - The type of the image
 * @param {Stream} image - The image of the applicant
 * @param {object} opts - Options for the image (front/back)
 * @return {Promise} A Promise from the OnFido module
 */
function uploadDocument(applicantId, imageType, image, opts) {
  return api.uploadDocument(applicantId, imageType, image, opts);
}

/**
 * Upload a selfie to an OnFido applicant
 * @param {string} applicantId - The ID of the applicant
 * @param {Stream} image - The image of the applicant
 * @param {object} opts - Options for the live photo (advanced_validation)
 * @return {Promise} A Promise from the OnFido module
 */
function uploadLivePhoto(applicantId, image, opts) {
  return api.uploadLivePhoto(applicantId, image, opts);
}

/**
 * List all documents of an OnFido applicant
 * @param {string} applicantId - The ID of the applicant
 * @return {Promise} A Promise from the OnFido module
 */
function listDocuments(applicantId) {
  return api.listDocuments(applicantId);
}

/**
 * List all live photos of an OnFido applicant
 * @param {string} applicantId - The ID of the applicant
 * @return {Promise} A Promise from the OnFido module
 */
function listLivePhotos(applicantId) {
  return api.listLivePhotos(applicantId);
}

/**
 * Starts an OnFido check
 * @param {string} applicantId - The OnFido applicant ID
 * @param {string} checkType - express/standard
 * @param {Boolean} asynchronous - get the check's results via the webhook or directly
 * @return {Promise} A Promise from the OnFido module
 */
function startCheck(applicantId, checkType=Const.ONFIDO_CHECK_EXPRESS, asynchronous=true) {
  const check = new OnFido.CheckCommon();
  check.type = checkType;
  check.asynchronous = asynchronous;
  check.reports = [{name: 'document'}, {name: 'facial_similarity'}, {name: 'watchlist', variant: 'full'}];

  return api.createCheck(applicantId, check);
}

/**
 * Gets an OnFido check
 * @param {string} applicantId - The OnFido applicant ID
 * @param {string} checkId - The OnFido check ID
 * @return {Promise} A Promise from the OnFido module
 */
function findCheck(applicantId, checkId) {
  return api.findCheck(applicantId, checkId);
}

/**
 * Gets an OnFido report
 * @param {string} checkId - The OnFido check ID
 * @param {string} reportId - The OnFido applicant ID
 * @return {Promise} A Promise from the OnFido module
 */
function findReport(checkId, reportId) {
  return api.findReport(checkId, reportId);
}

module.exports = {
  createApplicant,
  createFakeApplicant,
  updateApplicant,
  deleteApplicant,
  uploadDocument,
  uploadLivePhoto,
  listDocuments,
  listLivePhotos,
  startCheck,
  findCheck,
  findReport,
};
