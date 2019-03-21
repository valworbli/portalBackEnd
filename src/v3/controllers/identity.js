const HttpStatus = require('http-status-codes');
const logger = require('../components/logger')(module);

/**
 * POST identity/image
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 */
function postImage(req, res) {
  try {
    logger.info('Successfully uploaded ' + req.files.length + ' files');
    res.status(HttpStatus.OK).json({data: true});
  } catch (err) {
    logger.error('Error uploading the images: ' + JSON.stringify(err));
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({data: false});
  }
}
/**
 * GET identity/image
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 */
function getImage(req, res) {

}
/**
 * POST identity/application
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 */
function postApplication(req, res) {

}
/**
 * GET identity/application
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 */
function getApplication(req, res) {

}
/**
 * GET identity/documents
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 */
function getDocuments(req, res) {

}

module.exports = {
  postImage,
  getImage,
  postApplication,
  getApplication,
  getDocuments,
};
