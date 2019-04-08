const logger = require('../components/logger')(module);
const aws = require('aws-sdk');
const asyncForEach = require('./asyncFunctions').asyncForEach;

aws.config.update({
  secretAccessKey: process.env.SES_SECRET_ACCESS_KEY,
  accessKeyId: process.env.SES_ACCESS_KEY_ID,
  region: process.env.S3_IMAGES_BUCKET_REGION,
});

const s3 = new aws.S3();

// middleware that is specific to this router
module.exports = function(options) {
  return function uploadToS3(req, res, next) {
    try {
      let count = 0;
      const prefix = options.useDBID ? req.worbliUser._id + '/' : '';

      if (!req.files) {
        logger.error('S3 uploader: no files are present, skipping...');
        return next();
      }

      // logger.info('S3 Uploader: files is ' +
      // JSON.stringify(req.files.length));

      asyncForEach(req.files, async (element) => {
        await (async () => {
          const filesCount = req.files.length;

          const fName = prefix + element.fieldname + '_' + Date.now() + '.jpg';
          // logger.info('===== S3 UPLOADING ' + fName);
          const params = {
            Bucket: process.env.S3_IMAGES_BUCKET_NAME,
            Key: fName,
            Body: element.buffer,
          };

          s3.upload(params, function(perr, pres) {
            if (perr) {
              logger.error('Error uploading data: ', perr);
            }
            // else
            //   logger.info('Successfully uploaded data: ', pres);

            count += 1;
            if (count === filesCount) {
              next();
            }
          });
        })();
      });
    } catch (err) {
      logger.error('Error uploading the images to S3: ' + JSON.stringify(err));
      next();
    }
  };
};
