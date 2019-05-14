/* eslint max-len: 0, require-jsdoc: 0 */
require('dotenv').config({path: '../../.env'});
const Promise = require('bluebird');
const HttpStatus = require('http-status-codes');
const mongoose = require('mongoose');
mongoose.Promise = Promise;
const ofWrapper = require('./components/onfidoWrapper');
const ofChecksSchema = require('./models/schemas/onfidoChecks').ofChecksSchema;
const usersSchema = require('./models/schemas/users').usersSchema;

const https = require('https');
const fs = require('fs');
const glob = require('glob');

const logger = require('./components/logger').short(module);
const aws = require('aws-sdk');
aws.config.update({
  secretAccessKey: process.env.SES_SECRET_ACCESS_KEY,
  accessKeyId: process.env.SES_ACCESS_KEY_ID,
  region: process.env.S3_IMAGES_BUCKET_REGION,
});
const s3 = new aws.S3();
const Archiver = require('./components/sync/Archiver');
const streamBuffers = require('stream-buffers');

const dbConn = mongoose.createConnection(process.env.DB_CONN, {
  dbName: process.env.DB_NAME, useNewUrlParser: true,
});

const Users = dbConn.model('users', usersSchema);
const OFChecks = dbConn.model('onfidochecks', ofChecksSchema);

const delay = 1000;
const checkDelay = 1000;

/**
 * Acts as a sleep() function
 * @param {number} ms - the number of milliseconds to wait
 * @return {Promise} - a promise which will fulfill after the given time
 */
function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createOFCheck(user, check) {
  return new OFChecks({
    user: user._id,
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
}

function downloadOnfidoFile(url, fileName) {
  const options = {
    host: 'api.onfido.com',
    port: 443,
    path: url,
    headers: {
      'Authorization': 'Token token=' + process.env.ONFIDO_TOKEN,
    },
  };

  return new Promise((resolve, reject) => {
    try {
      const file = fs.createWriteStream(fileName);
      https.get(options, function(response) {
        if (response.statusCode !== HttpStatus.OK) {
          reject('Error downloading the file: ' + JSON.stringify(response.headers));
        }
        response.pipe(file);
        file.on('finish', function() {
          file.close(function() {
            logger.info('WROTE THE FILE TO ' + fileName);
            resolve(true);
          });
        });
      }).on('error', function(err) {
        logger.error('FAILED to write the file: ' + JSON.stringify(err));
        fs.unlink(fileName);
        reject(err);
      });
    } catch (err) {
      logger.error('Error downloading the document: ' + JSON.stringify(err));
      reject(err);
    }
  });
}

function downloadOnfidoFileToStream(url) {
  const options = {
    host: 'api.onfido.com',
    port: 443,
    path: url,
    headers: {
      'Authorization': 'Token token=' + process.env.ONFIDO_TOKEN,
    },
  };

  const outputStreamBuffer = new streamBuffers.WritableStreamBuffer({
    initialSize: (100 * 1024), // start at 100 kilobytes.
    incrementAmount: (100 * 1024), // grow by 100 kilobytes each time buffer overflows.
  });

  return new Promise((resolve, reject) => {
    try {
      https.get(options, function(response) {
        if (response.statusCode !== HttpStatus.OK) {
          reject('Error downloading the file: ' + JSON.stringify(response.headers));
        }

        response.pipe(outputStreamBuffer);
        outputStreamBuffer.on('finish', function() {
          logger.info('DOWNLOADED ' + outputStreamBuffer.size() + ' bytes from ' + url);
          resolve(outputStreamBuffer);
        });
      }).on('error', function(err) {
        logger.error('FAILED to DOWNLOAD the url: ' + JSON.stringify(err));
        outputStreamBuffer.end();
        reject(err);
      });
    } catch (err) {
      logger.error('Error downloading the document: ' + JSON.stringify(err));
      reject(err);
    }
  });
}

async function processChecks(user, userFolder, archiver) {
  const email = JSON.stringify(user.email);
  const checks = await ofWrapper.listChecks(user.onfido.onfido_id).catch(function(err) {
    logger.error('    Error obtaining the checks for user ' + email + ', err: ' + JSON.stringify(err));
  });
  if (!checks || checks.checks.length === 0) {
    logger.info('    No checks exist for user ' + email);
  } else {
    let checksCount = 0;
    const userChecksFolder = userFolder + 'checks/';
    if (!fs.existsSync(userChecksFolder)) fs.mkdirSync(userChecksFolder);
    logger.info('    Obtained ' + checks.checks.length + ' OnFido checks for user ' + email);

    for (const check of checks.checks) {
      const userCheckFolder = userChecksFolder + check.id + '/';
      if (!fs.existsSync(userCheckFolder)) fs.mkdirSync(userCheckFolder);
      if (archiver) {
        if (!fs.existsSync(userCheckFolder + check.id + '.tar.gz')) {
          await archiver.compressFile(JSON.stringify(check), check.id + '.json', userCheckFolder + check.id + '.tar.gz');
          archiver = new Archiver(true);
        }
      } else {
        if (!fs.existsSync(userCheckFolder + check.id + '.json')) fs.writeFileSync(userCheckFolder + check.id + '.json', JSON.stringify(check));
      }

      checksCount += 1;
      logger.info('        Processing check ' + JSON.stringify(check.id) + ': ' + checksCount + ' out of ' + checks.checks.length);

      const dbCheck = await OFChecks.findOne({user: user._id, onfido_id: check.id}).exec().catch(function(err) {
        logger.info('DB check ' + JSON.stringify(check.id) + ' NOT FOUND in the db');
      });

      let ofCheck = undefined;
      if (!dbCheck) {
        ofCheck = createOFCheck(user, check);
      } else {
        ofCheck = dbCheck;
      }

      let reportCount = 0;

      for (const reportId of check.reports) {
        const userReportFolder = userCheckFolder + reportId + '/';
        if (!fs.existsSync(userReportFolder)) fs.mkdirSync(userReportFolder);

        let report = undefined;
        if (dbCheck) report = dbCheck.includesReport(reportId);
        reportCount += 1;
        if (dbCheck && report) {
          logger.info('        Report ' + JSON.stringify(reportId) + ' is present in the DB, NOT downloading it');
        } else {
          await timeout(delay);
          report = await ofWrapper.findReport(check.id, reportId).catch(function(err) {
            logger.error('        ++++ Error obtaining report ' + JSON.stringify(reportId) + ', err: ' + JSON.stringify(err));
          });
          if (report) {
            logger.info('        Obtained report ' + JSON.stringify(reportId) + ': ' + reportCount + ' out of ' + check.reports.length);
            ofCheck.addReport(report);
          }
        }

        let bArchive = false;

        if (report) {
          if (archiver) {
            if (!fs.existsSync(userReportFolder + reportId + '.tar.gz')) {
              archiver.start(userReportFolder + reportId + '.tar.gz');
              archiver.archive.append(JSON.stringify(report), {name: reportId + '.json'});
              bArchive = true;
            } else {
              logger.warn('        An archive of the report EXISTS, skipping it...');
              continue;
            }
          } else {
            if (!fs.existsSync(userReportFolder + reportId + '.json')) {
              fs.writeFileSync(userReportFolder + reportId + '.json', JSON.stringify(report));
            } else {
              logger.warn('        A copy of the report EXISTS, skipping it...');
              continue;
            }
          }
        } else {
          continue;
        }

        if (!report.documents) {
          logger.info('        The report contains NO documents, skipping it...');
        } else {
          // check if the document is present in S3
          // construct the file name
          for (const documentId of report.documents) {
            const docNameTmpl = `${userReportFolder}${documentId.id}_*.*`;
            if (glob.sync(docNameTmpl).length > 0) {
              logger.info('            Document ' + JSON.stringify(documentId.id) + ' exists, skipping it');
            } else {
              logger.info('            Document ' + JSON.stringify(documentId.id) + ' DOES NOT exist, downloading it');
              await timeout(delay);
              // if there is an archive (a single file) for that report in S3
              // then assume all the documents have been downloaded already
              const document = await ofWrapper.findDocument(user.onfido.onfido_id, documentId.id);
              const docName = userReportFolder + documentId.id + '_' + document.file_name;

              const download = bArchive ?
              await downloadOnfidoFileToStream(document.download_href).catch(function(err) {
                logger.error('        Error downloading the document to a buffer: ' + JSON.stringify(err));
              }) :
              await downloadOnfidoFile(document.download_href, docName).catch(function(err) {});

              if (bArchive) {
                if (download) {
                  archiver.archive.append(download.getContents(), {name: docName});
                  logger.info('        Appended the document to the archive');
                }
              }
            }
          }
        }

        if (bArchive) {
          logger.warn('Finalizing the archive...');
          await archiver.stop();
          archiver = new Archiver(true);
        }
      }

      if (reportCount) {
        const sCheck = await ofCheck.save().catch(function(err) {
          logger.error('++++ Error saving the OnFido check: ' +
            ofCheck.onfido_id + ', err: ' + JSON.stringify(err));
        });
        if (sCheck) {
          logger.info('    SUCCESSFULLY saved check ' + JSON.stringify(ofCheck.onfido_id));
        }
      } else {
        // logger.info('Check ' + JSON.stringify(ofCheck.onfido_id) + ' has NOT been modified, NOT saving it.');
      }
    }
  }
}

async function processLivePhotos(user, userFolder, archiver) {
  const email = JSON.stringify(user.email);

  const livePhotos = await ofWrapper.listLivePhotos(user.onfido.onfido_id).catch(function(err) {
    logger.error('    Error obtaining the live photos for user ' + email + ', err: ' + JSON.stringify(err));
  });

  const userLPFolder = userFolder + 'Live/';
  if (livePhotos && livePhotos.live_photos) {
    if (!fs.existsSync(userLPFolder)) fs.mkdirSync(userLPFolder);
    logger.info('    Live photos for the user: ' + livePhotos.live_photos.length);
    if (archiver) {
      if (!fs.existsSync(userLPFolder + 'livePhotos.tar.gz')) {
        await archiver.compressFile(JSON.stringify(livePhotos), 'livePhotos.json', userLPFolder + 'livePhotos.tar.gz');
        archiver = new Archiver(true);
      }
    } else {
      if (!fs.existsSync(userLPFolder + 'livePhotos.json')) fs.writeFileSync(userLPFolder + 'livePhotos.json', JSON.stringify(livePhotos));
    }
  } else {
    logger.info('COULD NOT OBTAIN THE LIVE PHOTOS for user ' + email);
    return;
  }

  for (const livePhotoId of livePhotos.live_photos) {
    if (!archiver) {
      if (!fs.existsSync(userLPFolder + livePhotoId.id + '.json')) {
        fs.writeFileSync(userLPFolder + livePhotoId.id + '.json', JSON.stringify(livePhotoId));
        logger.info('Saved the livePhotoId to ' + userLPFolder + livePhotoId.id + '.json');
      }
    }

    let bArchive = false;
    if (archiver) {
      if (!fs.existsSync(userLPFolder + livePhotoId.id + '.tar.gz')) {
        archiver.start(userLPFolder + livePhotoId.id + '.tar.gz');
        archiver.archive.append(JSON.stringify(livePhotoId), {name: livePhotoId.id + '.json'});
        bArchive = true;
      } else {
        logger.warn('        An archive of the live photo EXISTS, skipping it...');
        continue;
      }
    }

    const lpNameTmpl = userLPFolder + JSON.stringify(livePhotoId.id) + '_*.*';
    if (glob.sync(lpNameTmpl).length > 0) {
      logger.info('        LivePhoto ' + JSON.stringify(livePhotoId.id) + ' exists, skipping it');
    } else {
      logger.info('        LivePhoto ' + JSON.stringify(livePhotoId.id) + ' DOES NOT exist, downloading it');
      await timeout(delay);
      // if there is an archive (a single file) for that report in S3
      // then assume all the documents have been downloaded already
      const lp = await ofWrapper.findLivePhoto(livePhotoId.id).catch(function(err) {
        logger.error('        Error downloading the live photo ' + JSON.stringify(livePhotoId.id) + ': ' + JSON.stringify(err));
      });

      if (lp) {
        const lpName = livePhotoId.id + '_' + lp.file_name;
        const lpDownload = bArchive ?
          await downloadOnfidoFileToStream(lp.download_href).catch(function(err) {
            logger.error('        Error downloading the file to a buffer: ' + JSON.stringify(err));
          }) :
          await downloadOnfidoFile(lp.download_href, userLPFolder + lpName).catch(function(err) {});

        if (bArchive) {
          if (lpDownload) {
            archiver.archive.append(lpDownload.getContents(), {name: lpName});
            logger.info('        Appended the live photo to the archive');
            await archiver.stop();
          } else {
            await archiver.abort();
          }
        }
      }
    }
  }
}

Users.estimatedDocumentCount(async function(err, count) {
  logger.info('There are ' + JSON.stringify(count) + ' users in the DB');
  let usersCount = 0;
  const cursor = Users.find().cursor();
  cursor.eachAsync(async function(user) {
    const email = JSON.stringify(user.email);
    usersCount += 1;
    logger.info('Processing user ' + email + ': ' + usersCount + ' out of ' + count);
    try {
      if (user.onfido.onfido_id) {
        // check if the user's data is present in S3
        // construct the file name
        const udFileName = user.id + '/' + user.id + '.tar.gz';
        let s3Err = {};
        await s3.headObject({Bucket: process.env.S3_IMAGES_BUCKET_NAME, Key: udFileName}).promise().catch(function(err) {
          logger.error('Error checking whether the file ' + udFileName + ' exists on S3: ' + JSON.stringify(err));
          s3Err = err;
        });

        if (s3Err.statusCode !== HttpStatus.NOT_FOUND) {
          logger.info('        Onfido archive ' + udFileName + ' EXISTS on S3, skipping it.');
        } else {
          logger.info('        Onfido archive ' + udFileName + ' DOES NOT exist on S3, skipping it.');
          const userFolder = '/tmp/a/' + user._id + '/';
          if (!fs.existsSync(userFolder)) fs.mkdirSync(userFolder);

          let archiver = new Archiver(true);

          await processChecks(user, userFolder, archiver);
          await timeout(checkDelay);

          archiver = new Archiver(true);

          await processLivePhotos(user, userFolder, archiver);
          await timeout(checkDelay);

          // create a new tar.gz, encrypted, from all the
          // encrypted checks and live photos of the user
          const userArchive = '/tmp/a/' + user._id + '.tar.gz';
          archiver = new Archiver(true);
          archiver.start(userArchive);
          archiver.archive.directory(userFolder, user._id + '/');
          await archiver.stop();
          logger.info('Archived all the user\'s data to ' + userArchive);
          let data = fs.readFileSync(userArchive);
          const params = {
            Bucket: process.env.S3_IMAGES_BUCKET_NAME,
            Key: udFileName,
            Body: data,
          };
          s3Err = undefined;
          await s3.upload(params).promise().catch(function(err) {
            logger.error('Error uploading the user\'s data: ' + JSON.stringify(err));
            s3Err = err;
          });

          if (s3Err === undefined) {
            logger.info('Uploaded the archive to S3: ' + udFileName);
            // fs.unlinkSync(userArchive);
          }
        }
      } else {
        logger.error('!!!! User ' + email + ' has NO OnFido ID!!!!');
      }
    } catch (err) {
      logger.error('ERROR processing: ' + JSON.stringify(err));
    }
  }, function() {
    logger.info('Finished iterating through the users');
    process.exit(0);
  });
});
