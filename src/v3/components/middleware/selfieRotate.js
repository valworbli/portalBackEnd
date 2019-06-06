/* eslint max-len: 0 */
const Const = require('../../defs/const.js');
const logger = require('../logger')(module);
const aws = require('aws-sdk');
const sharp = require('sharp');

aws.config.update({
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  region: process.env.S3_IMAGES_BUCKET_REGION,
  apiVersions: {
    rekognition: '2016-06-27',
  },
});

const rekognition = new aws.Rekognition();

/**
 * roundDegrees - rounds up degrees to the nearest multiple of 90
 * @param {number} degrees
 * @return {number} - the rounded degrees
 */
function roundDegrees(degrees) {
  return Math.round(degrees / 90) * 90 % 360;
}

module.exports = function(options) {
  return function(req, res, next) {
    if (!req.files) {
      logger.info('uploadSerializer: no files are present, skipping...');
      next();
    } else {
      let selfieFound = false;
      for (const file of req.files) {
        if (file[Const.S3] && !file[Const.S3].failed) {
          if (!file[Const.S3].fileName.includes(Const.ID_SELFIE)) {
            continue;
          }

          selfieFound = true;

          const params = {
            Image: {
              S3Object: {
                Bucket: process.env.S3_IMAGES_BUCKET_NAME,
                Name: file[Const.S3].fileName,
              },
            },
          };

          rekognition.detectFaces(params, function(err, data) {
            if (err) {
              logger.error('Error detecting faces :' + JSON.stringify(err));
              next();
            } else {
              // logger.info('SUCCESS detecting faces: ' + JSON.stringify(data));
              file[Const.PROCESSING] = {faces: data.FaceDetails.length};
              if (data.FaceDetails.length === 1) {
                // only process images with one face in them
                const orientation = roundDegrees(data.FaceDetails[0].Pose.Roll);
                if (orientation !== 0) {
                  sharp(file.buffer)
                      .rotate((360 - orientation) % 360)
                      .toBuffer()
                      .then(function(data) {
                        file.buffer = data;
                        logger.info('Image successfully rotated ' + (360 - orientation) % 360 + ' degrees');
                        next();
                      })
                      .catch(function(err) {
                        logger.error('ERROR rotating the image: ' + JSON.stringify(err));
                        next();
                      });
                } else {
                  next();
                }
              } else {
                next();
              }
            }
          });
        }
      }

      if (!selfieFound) {
        next();
      }
    }
  };
};
