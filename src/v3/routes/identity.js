const express = require('express');
const validate = require('express-validation');
const identityController = require('../controllers/identity.js');
const router = new express.Router();
// const jwtAuthenticator = require('../components/jwtAuthenticator');

const postImage = require('../validators/identity/postImage.js');
const getImage = require('../validators/identity/getImage.js');
const postApplication = require('../validators/identity/postApplication.js');
const getApplication = require('../validators/identity/getApplication.js');
const getDocuments = require('../validators/identity/getDocuments.js');

const multer = require('multer');
const multerS3 = require('multer-s3');
const aws = require('aws-sdk');

aws.config.update({
  secretAccessKey: process.env.SES_SECRET_ACCESS_KEY,
  accessKeyId: process.env.SES_ACCESS_KEY_ID,
  region: process.env.S3_IMAGES_BUCKET_REGION,
});

const s3 = new aws.S3();

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_IMAGES_BUCKET_NAME,
    metadata: function(req, file, cb) {
      cb(null, {fieldName: file.fieldname});
    },
    key: function(req, file, cb) {
      cb(null, Date.now().toString());
    },
  }),
});

router.route('/image/').get(validate(getImage.validate),
    identityController.getImage);
router.route('/image/').post(validate(postImage.validate),
    jwtAuthenticator({}), upload.array('photos', 3),
    identityController.postImage);
router.route('/application/').get(validate(getApplication.validate),
    identityController.getApplication);
router.route('/application/').post(validate(postApplication.validate),
    identityController.postApplication);
router.route('/documents/').post(validate(getDocuments.validate),
    identityController.getDocuments);

module.exports = router;
