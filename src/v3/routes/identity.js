const express = require('express');
const validate = require('express-validation');
const identityController = require('../controllers/identity.js');
const router = new express.Router();

const postImage = require('../validators/identity/postImage.js');
const getImage = require('../validators/identity/getImage.js');
const postApplication = require('../validators/identity/postApplication.js');
const getApplication = require('../validators/identity/getApplication.js');
const getDocuments = require('../validators/identity/getDocuments.js');

router.route('/image/').get(validate(postImage.validate),
    identityController.postImage);
router.route('/image/').post(validate(getImage.validate),
    identityController.getImage);
router.route('/application/').get(validate(postApplication.validate),
    identityController.postApplication);
router.route('/application/').post(validate(getApplication.validate),
    identityController.getApplication);
router.route('/documents/').post(validate(getDocuments.validate),
    identityController.getDocuments);

module.exports = router;
