/* eslint max-len: 0 */
const Const = require('../defs/const.js');
const logger = require('./logger')(module);
const aws = require('aws-sdk');

aws.config.update({
  secretAccessKey: process.env.SES_SECRET_ACCESS_KEY,
  accessKeyId: process.env.SES_ACCESS_KEY_ID,
  region: process.env.S3_IMAGES_BUCKET_REGION,
  apiVersions: {
    rekognition: '2016-06-27',
  },
});

const rekognition = new aws.Rekognition();

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
            if (err) logger.error('Error detecting faces :' + JSON.stringify(err));
            else logger.info('SUCCESS detecting faces: ' + JSON.stringify(data));

            next();
          });
        }
      }

      if (!selfieFound)
        next();
    }
  };
};
