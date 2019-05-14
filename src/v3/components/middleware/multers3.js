const multer = require('multer');
// const multerS3 = require('multer-s3');
// const aws = require('aws-sdk');
// const logger = require('../components/logger')(module);

// aws.config.update({
//   secretAccessKey: process.env.SES_SECRET_ACCESS_KEY,
//   accessKeyId: process.env.SES_ACCESS_KEY_ID,
//   region: process.env.S3_IMAGES_BUCKET_REGION,
// });

// const s3 = new aws.S3();

/**
 * Creates the upload handler
 * @param {object} options - the configuration for the upload handler
 * @return {object} multerS3 - the actual upload handler
 */
// function uploadHandler(options) {
//   return multer({
//     storage: multerS3({
//       s3: s3,
//       bucket: process.env.S3_IMAGES_BUCKET_NAME,
//       metadata: function(req, file, cb) {
//         cb(null, {fieldName: file.fieldname});
//       },
//       key: function(req, file, cb) {
//         const prefix = options.useDBID ? req.worbliUser._id + '/' : '';
//         cb(null, prefix + file.fieldname);
//       },
//     }),
//   });
// }

/**
 * Creates the upload handler
 * @param {object} options - the configuration for the upload handler
 * @return {object} multerS3 - the actual upload handler
 */
function uploadHandler(options) {
  return multer({
    storage: multer.memoryStorage(),
    inMemory: true,
    limits: {fileSize: 3000000},
    // onFileUploadData: function(file, data, req, res) {
    //   const prefix = options.useDBID ? req.worbliUser._id + '/' : '';
    //   const params = {
    //     Bucket: process.env.S3_IMAGES_BUCKET_NAME,
    //     Key: prefix + file.fieldname,
    //     Body: data,
    //   };

    //   s3.putObject(params, function(perr, pres) {
    //     if (perr) {
    //       logger.error('Error uploading data: ', perr);
    //     } else {
    //       logger.info('Successfully uploaded data: ', pres);
    //     }
    //   });
    // },
  });
}

module.exports = uploadHandler;
