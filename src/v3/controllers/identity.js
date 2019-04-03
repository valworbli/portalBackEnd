/* eslint max-len: 0 */
const HttpStatus = require('http-status-codes');
const logger = require('../components/logger')(module);
const IDDocs = require('../models/schemas/idDocs');
const ofWrapper = require('../components/onfidoWrapper');
const Const = require('../defs/const.js');
const crypto = require('crypto');
const Users = require('../models/users');

/**
 * Internal _getMissingImages
 * @param {object} user - A UsersSchema object
 * @return {Promise} A Promise with the result
 */
function _getMissingImages(user) {
  return new Promise(function(resolve, reject) {
    if (!user.identity_images) {
      resolve({status: HttpStatus.OK, body: {
        completed: false,
        missingDocuments: ['selfie', 'identity'],
        data: true,
      }});
    }

    const countryPrefix = user.identity_images.country;
    IDDocs.findOne({code: countryPrefix}, function(err, countryInfo) {
      if (!countryInfo) {
        reject({status: HttpStatus.BAD_REQUEST, body: {data: false,
          error: 'Malformed request submitted!'}});
      } else {
        const result = user.identity_images.verify(countryInfo.accepted[0]);
        if (result.error) {
          reject({status: HttpStatus.BAD_REQUEST, body: {data: false,
            error: 'Malformed request submitted!'}});
        } else {
          resolve({status: HttpStatus.OK, body: {
            completed: user.identity_images.completed,
            missingDocuments: result.missingDocuments,
            data: true,
          }});
        }
      }
    });
  });
}

/**
 * POST identity/image
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 * @return {object} The response
 */
async function postImage(req, res) {
  // try {
  const {user} = req.worbliUser;
  let countryPrefix = undefined;

  user.initIDImages();

  if (!req.files) {
    logger.error('identity.postImage: no files are present, skipping...');
    return res.status(HttpStatus.BAD_REQUEST).
        json({data: false, error: 'Please include at least one file in the request!'});
  }

  // get the country from the uploaded file.fieldname
  countryPrefix = req.files[0].fieldname.split('_')[0];

  if (user.identity_images && (user.identity_images.country !== countryPrefix)) {
    user.initIDImages(true);
  } else {
    user.identity_images.completed = false;
  }

  req.files.forEach(function(element) {
    const docName = element.fieldname.substring(countryPrefix.length + 1);
    user.identity_images.pushDocumentUnique(docName);
  });

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

      user.save(function(err, user) {
        res.status(HttpStatus.OK).json({
          completed: user.identity_images.completed,
          missingDocuments: result.missingDocuments,
          data: true,
        });
      });
    }
  }
  // } catch (err) {
  //   logger.error('Error uploading the images: ' + JSON.stringify(err));
  //   res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({data: false});
  // }
}

/**
 * GET identity/missingimages
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 */
function getMissingImages(req, res) {
  const {user} = req.worbliUser;
  let resp = undefined;

  _getMissingImages(user).then((response) => {
    resp = response;
  }).catch((response) => {
    resp = response;
  }).finally(() => {
    res.status(resp.status).json(resp.body);
  });
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
  const {user} = req.worbliUser;

  const {country, firstName, middleName,
    lastName, day, month, year, gender} = req.body;

  if (user.verify_token) {
    res.status(HttpStatus.CONFLICT).json({data: false,
      error: 'Please verify your email first.'});
    logger.error('CONFLICT: User is not verified!');
  } else {
    _getMissingImages(user).then((response) => {
      if (!response.body.completed) {
        logger.error('CONFLICT: Images are missing!');
        res.status(HttpStatus.CONFLICT).json({data: false,
          error: 'Please upload all the required images first.',
          missingDocuments: response.body.missingDocuments,
        });
      } else {
        user.name_first = firstName;
        user.name_middle = middleName;
        user.name_last = lastName;
        user.address_country = country;
        user.date_birth = new Date(year, month-1, day, 0, 0, 0, 0);
        user.gender = gender;

        user.save(function(err, user) {
          if (err) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({data: false,
              error: 'Error saving the user, please try again later.'});
          } else {
            if (user.onfido.onfido_status === Const.ONFIDO_STATUS_CREATED) {
              Promise.all([ofWrapper.updateApplicant(user),
                ofWrapper.startCheck(user.onfido.onfido_id)]).then(function(values) {
                const applicant = values[0];
                logger.info('OnFido Applicant UPDATED, id: ' +
                    JSON.stringify(applicant.id));
                user.onfido.onfido_id = applicant.id;

                const check = values[1];
                logger.info('OnFido check started: ' +
                    JSON.stringify(check));

                user.onfido.onfido_check = check.id;
                user.onfido.onfido_status = Const.ONFIDO_STATUS_PENDING;
                user.onfido.onfido_error = false;
              }).catch((error) => {
                logger.error('OnFido Applicant ERRORED' +
                      JSON.stringify(error.response.body));
                user.onfido.onfido_error = true;
                user.onfido.onfido_status = Const.ONFIDO_STATUS_CREATED;
              }).finally(() => {
                logger.info('The user\'s ONFIDO status is now ' +
                    JSON.stringify(user.onfido.onfido_status));
                user.save(function(err, user) {
                  if (err) {
                    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                      data: false,
                      error: 'Error saving the user\'s details after OF, please try again later.'});
                  } else {
                    const ofStatus = user.getOnFidoStatus();
                    res.status(HttpStatus.OK).json({...ofStatus, data: true});
                  }
                });
              });
            } else {
              const ofStatus = user.getOnFidoStatus();
              res.status(HttpStatus.OK).json({...ofStatus, data: true});
            }
          }
        });
      }
    }).catch((response) => {
      res.status(response.status).json(response.body);
    });
  }
}

/**
 * Webhook
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 * @property {string} req.body.payload.resource_type - The resource type.
 * @property {string} req.body.payload.action - The resource type.
 * @property {string} req.body.payload.object.id - The resource type.
 * @property {string} req.body.payload.object.status - The resource type.
 * @property {string} req.body.payload.object.completed_at - The resource type.
 * @property {string} req.body.payload.object.href - The resource type.
 */
function postWebHook(req, res) {
  try {
    const xheader = req.headers['x-signature'];
    const resourceType = req.body.payload.resource_type;
    const action = req.body.payload.action;
    const onfidoId = req.body.payload.object.id;
    const status = req.body.payload.object.status;
    const completedAt = req.body.payload.object.completed_at;
    const href = req.body.payload.object.href;
    const token = crypto.createHmac('sha1', process.env.ONFIDO_WEBHOOK_SECRET)
        .update(JSON.stringify(req.body)).digest('hex');
    if (xheader === token) {
      logger.info('WebHook received: id: ' + JSON.stringify(onfidoId) + ', action: ' + JSON.stringify(action) +
        ', resourceType: ' + JSON.stringify(resourceType) + ', status: ' + JSON.stringify(status) +
          ', completedAt: ' + JSON.stringify(completedAt) + ', href: ' + JSON.stringify(href));

      Users.onfidoCheckCompleted(onfidoId).
        then(function (user) {}).
        catch(function(err) {
        }).finally(() => {
          res.status(200).json({data: true});
        });
    } else {
      res.status(400).json({data: false});
    }
  } catch (err) {
    res.status(400).json({data: false});
  }
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
  postWebHook,
};
