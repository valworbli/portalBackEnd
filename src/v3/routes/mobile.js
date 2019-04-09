const express = require('express');
const validate = require('express-validation');
const mobileController = require('../controllers/mobile');
const router = new express.Router();
const jwtAuthenticator = require('../components/jwtAuthenticator');

const postSMS = require('../validators/mobile/postSMS');
const getShortCode = require('../validators/mobile/getShortCode');

router.route('/sms/').post(validate(postSMS.validate),
    jwtAuthenticator({}), mobileController.postSMS);
router.route('/shortcode/').get(validate(getShortCode.validate),
    jwtAuthenticator({getUser: true}), mobileController.getShortCode);

module.exports = router;
