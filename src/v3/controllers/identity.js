const HttpStatus = require('http-status-codes');
const logger = require('../components/logger')(module);
const IDDocs = require('../models/schemas/idDocs');

/**
 * POST identity/image
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 */
async function postImage(req, res) {
  try {
    const {user} = req.worbliUser;
    let countryPrefix = undefined;

    // insert all the uploaded files' fieldnames
    // in the user.identity_images array
    user.initIDImages();

    req.files.forEach((element) => {
      // get the country from the uploaded file.fieldname
      if (!countryPrefix) {
        countryPrefix = element.fieldname.split('_')[0];
      }

      const docName = element.fieldname.substring(countryPrefix.length + 1);
      user.identity_images.pushDocumentUnique(docName);
    });

    user.identity_images.completed = false;

    // get the record for that country from MongoDB's worbli.identity_documents
    const countryInfo = await IDDocs.findOne({code: countryPrefix}).exec();
    if (!countryInfo) {
      res.status(HttpStatus.BAD_REQUEST).json({data: false,
        error: 'Malformed request submitted!'});
    } else {
      user.identity_images.country = countryPrefix;
      const result = user.identity_images.verify(countryInfo.accepted[0]);
      if (result.error) {
        res.status(HttpStatus.BAD_REQUEST).json({data: false,
          error: 'Malformed request submitted!'});
      } else {
        user.identity_images.completed = result.missingDocuments.length === 0;

        await user.save(function(err, user) {
          res.status(HttpStatus.OK).json({
            completed: user.identity_images.completed,
            missingDocuments: result.missingDocuments,
            data: true,
          });
        });
      }
    }
  } catch (err) {
    logger.error('Error uploading the images: ' + JSON.stringify(err));
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({data: false});
  }
}

/**
 * GET identity/missingimages
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 */
async function getMissingImages(req, res) {
  // try {
  const {user} = req.worbliUser;
  const countryPrefix = user.identity_images.country;
  const countryInfo = await IDDocs.findOne({code: countryPrefix}).exec();

  if (!countryInfo) {
    res.status(HttpStatus.BAD_REQUEST).json({data: false,
      error: 'Malformed request submitted!'});
  } else {
    const result = user.identity_images.verify(countryInfo.accepted[0]);
    if (result.error) {
      res.status(HttpStatus.BAD_REQUEST).json({data: false,
        error: 'Malformed request submitted!'});
    } else {
      res.status(HttpStatus.OK).json({
        completed: user.identity_images.completed,
        missingDocuments: result.missingDocuments,
        data: true,
      });
    }
  }
  // } catch (err) {
  //   logger.error('Error uploading the images: ' + JSON.stringify(err));
  //   res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({data: false});
  // }
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
  getMissingImages,
};
