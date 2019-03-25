const express = require('express');
const validate = require('express-validation');
const identityController = require('../controllers/identity.js');
const router = new express.Router();
const jwtAuthenticator = require('../components/jwtAuthenticator');
const upload = require('../components/multers3')({useDBID: true});

const postImage = require('../validators/identity/postImage.js');
const getImage = require('../validators/identity/getImage.js');
const postApplication = require('../validators/identity/postApplication.js');
const getApplication = require('../validators/identity/getApplication.js');
const getDocuments = require('../validators/identity/getDocuments.js');
const getMissingImages = require('../validators/identity/getMissingImages.js');

router.route('/image/').get(validate(getImage.validate),
    identityController.getImage);
router.route('/image/').post(validate(postImage.validate),
    jwtAuthenticator({getUser: true}), upload.any(),
    identityController.postImage);
router.route('/application/').get(validate(getApplication.validate),
    identityController.getApplication);
router.route('/application/').post(validate(postApplication.validate),
    identityController.postApplication);
router.route('/documents/').post(validate(getDocuments.validate),
    identityController.getDocuments);
router.route('/missingimages/').get(validate(getMissingImages.validate),
    jwtAuthenticator({getUser: true}), identityController.getMissingImages);

module.exports = router;
