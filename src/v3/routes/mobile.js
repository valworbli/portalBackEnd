const express = require('express');
const validate = require('express-validation');
const mobileController = require('../controllers/mobile');
const router = new express.Router();
const jwtAuthenticator = require('../components/jwtAuthenticator');

const postSMS = require('../validators/mobile/postSMS');
const postFiles = require('../validators/mobile/postFiles');
const getShortCode = require('../validators/mobile/getShortCode');
const postShortCode = require('../validators/mobile/postShortCode');

router.route('/sms/').post(validate(postSMS.validate),
    jwtAuthenticator({getUser: true}), mobileController.postSMS);
router.route('/files/').post(validate(postFiles.validate),
    jwtAuthenticator({getUser: true}), mobileController.postFiles);
router.route('/shortcode/').get(validate(getShortCode.validate),
    jwtAuthenticator({getUser: true}), mobileController.getShortCode);
router.route('/shortcode/').post(validate(postShortCode.validate),
    mobileController.postShortCode);

module.exports = router;
