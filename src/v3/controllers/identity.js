/* eslint max-len: 0 */
const HttpStatus = require('http-status-codes');
const logger = require('../components/logger')(module);
const IDDocs = require('../models/schemas/idDocs');
const ofWrapper = require('../components/onfidoWrapper');
const Const = require('../defs/const.js');
const crypto = require('crypto');
const Users = require('../models/users');
const OFChecks = require('../models/schemas/onfidoChecks');
const utils = require('../components/utils');

/**
 * Internal _getMissingImages
 * @param {object} user - A UsersSchema object
 * @return {Promise} A Promise with the result
 */
function _getMissingImages(user) {
  return new Promise(function(resolve, reject) {
    if (!user.identity_images || !user.identity_images.country) {
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
            completed: result.missingDocuments.length === 0,
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
  const rejectedDocuments = [];

  user.initIDImages();

  if (!req.files) {
    logger.error('identity.postImage: no files are present, skipping...');
    return res.status(HttpStatus.BAD_REQUEST).
        json({data: false, error: 'Please include at least one file in the request!'});
  }

  let {deviceId, countryPrefix, docName, offset} = utils.extractNames(req.files[0].fieldname);

  if (user.identity_images && (user.identity_images.country !== countryPrefix)) {
    user.initIDImages(true);
  } else {
    user.identity_images.completed = false;
  }

  req.files.forEach(function(element) {
    docName = element.fieldname.substring(offset);
    if (element.failed) {
      logger.info('/identity/image: the file ' + docName + ' FAILED to be uploaded!');
      rejectedDocuments.push(docName);
    } else {
      user.identity_images.pushDocumentUnique(docName, deviceId);
    }
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
          rejectedDocuments: rejectedDocuments,
          completedDocuments: user.identity_images.uploaded_documents,
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
 * DEL identity/image
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 */
function delImage(req, res) {
  const {user} = req.worbliUser;
  let resp = undefined;

  // strip the country code from the doc name
  const countryPrefix = req.params['doctype'].split('_')[0];
  const docName = req.params['doctype'].substring(countryPrefix.length + 1);

  if (user.identity_images) {
    user.identity_images.delDocument(docName);
  }

  _getMissingImages(user).then(async (response) => {
    resp = response;
    if (user.identity_images) {
      user.identity_images.completed = response.body.completed;
      await user.save();
    }
  }).catch((response) => {
    resp = response;
  }).finally(() => {
    res.status(resp.status).json(resp.body);
  });
}

/**
 * DEL identity/identity
 * @param {string} req - The incoming request.
 * @param {string} res - The outcoming response.
 */
function delIdentityImages(req, res) {
  const {user} = req.worbliUser;
  let resp = undefined;

  if (user.identity_images) {
    if (user.identity_images.includes(Const.ID_SELFIE)) {
      user.identity_images.delAllBut(Const.ID_SELFIE);
    } else {
      user.identity_images.uploaded_documents = [];
    }
  } else {
    user.initIDImages(true);
  }

  _getMissingImages(user).then(async (response) => {
    resp = response;
    if (user.identity_images) {
      user.identity_images.completed = response.body.completed;
      await user.save();
    }
  }).catch((response) => {
    resp = response;
  }).finally(() => {
    res.status(resp.status).json(resp.body);
  });
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
        // if (lastName.length === 1) {
        // eslint-disable-next-line no-irregular-whitespace
        //   lastName += ' '; // that's U+2002 whitespace appended to the last name to trick OnFido...
        //   logger.info('The last name of the applicant is one symbol, changed it to ' + JSON.stringify(lastName));
        // }

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
              ofWrapper.updateApplicant(user).then(function(applicant) {
                logger.info('OnFido Applicant UPDATED, id: ' +
                  JSON.stringify(applicant.id));
                user.onfido.onfido_id = applicant.id;

                ofWrapper.startCheck(user.onfido.onfido_id).then(function(check) {
                  logger.info('OnFido check started: ' +
                    JSON.stringify(check));

                  user.onfido.onfido_check = check.id;
                  user.onfido.onfido_status = Const.ONFIDO_STATUS_PENDING;
                  user.onfido.onfido_error = false;
                }).catch(function(error) {
                  logger.error('OnFido START check ERRORED: ' +
                    JSON.stringify(error.response.body));
                  user.onfido.onfido_error = true;
                  user.onfido.onfido_status = Const.ONFIDO_STATUS_REJECTED;
                  user.onfido.onfido_error_message = JSON.stringify(error.response.body);
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
                      res.status(HttpStatus.OK).json({...ofStatus, data: !ofStatus.errored});
                    }
                  });
                });
              }).catch(function(error) {
                logger.error('OnFido UPDATE Applicant ERRORED: ' +
                      JSON.stringify(error.response.body));
                user.onfido.onfido_error = true;
                user.onfido.onfido_error_message = JSON.stringify(error.response.body);
                user.save(function(err, user) {
                  const ofStatus = user.getOnFidoStatus();
                  res.status(HttpStatus.OK).json({...ofStatus, data: false});
                  return;
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

      let myUser = undefined;
      const reports = [];
      let ofCheck = undefined;

      switch (action) {
        case Const.ONFIDO_CHECK_COMPLETED:
          Users.findByOnFidoCheck(onfidoId)
              .then(function(user) {
                myUser = user;
                return ofWrapper.findCheck(user.onfido.onfido_id, onfidoId);
              })
              .then(function(check) {
                let onfidoStatus = Const.ONFIDO_STATUS_APPROVED;
                logger.info('Webhook obtained check: ' + JSON.stringify(check));
                if (check.result !== Const.ONFIDO_CHECK_RESULT_CLEAR) {
                  onfidoStatus = Const.ONFIDO_STATUS_REJECTED;
                }

                try {
                  ofCheck = new OFChecks({
                    user: myUser._id,
                    onfido_id: check.id,
                    created_at: check.created_at,
                    href: check.href,
                    status: check.status,
                    result: check.result,
                    download_uri: check.download_uri,
                    results_uri: check.results_uri,
                    check_type: check.type,
                    dump: JSON.stringify(check),
                    reports: [],
                  });
                  logger.info('==== Created a new check: ' + JSON.stringify(ofCheck));
                  check.reports.reduce(function(acc, reportId) {
                    logger.info('==== processing report: ' + JSON.stringify(reportId));
                    acc.push(ofWrapper.findReport(check.id, reportId).catch(function(err) {
                      logger.error('Error obtaining report ' + JSON.stringify(check.id));
                    }));
                    return acc;
                  }, reports);
                  Promise.all(reports).then(function(values) {
                    values.forEach(function(report) {
                      logger.info('==== obtained a report: ' + JSON.stringify(report));
                      ofCheck.addReport(report);
                      logger.info('==== ADDED report: ' + JSON.stringify(report));
                    });
                  }).catch(function(err) {
                    logger.error('==== Error obtaining the reports: ' + JSON.stringify(err));
                  }).finally(function() {
                    ofCheck.save();
                    logger.info('==== Saved check ' + check.id);
                  });
                } catch (err) {
                  logger.error('Error iterating through the reports: ' + JSON.stringify(err));
                }
                return Users.onfidoCheckCompleted(myUser._id, onfidoStatus);
              })
              .then(function(user) {
                myUser = user;
              })
              .catch(function(err) {
                logger.error('Webhook could not find a user for check ' + JSON.stringify(onfidoId));
                logger.error('err is ' + JSON.stringify(err));
              })
              .finally(function() {
                if (myUser) {
                  logger.info('Webhook set the status of user ' +
                  JSON.stringify(myUser.email) + ' to ' +
                  JSON.stringify(myUser.onfido.onfido_status));
                }

                logger.info('Webhook ACKed the check.');
                res.status(200).json({data: true});
              });
          break;
        default:
          logger.info('Webhook ACKed the ' + JSON.stringify(action));
          res.status(200).json({data: true});
          break;
      }
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
  delImage,
  postApplication,
  getApplication,
  getDocuments,
  getMissingImages,
  postWebHook,
  delIdentityImages,
};
