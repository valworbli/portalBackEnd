const express = require('express');
const validate = require('express-validation');
const userController = require('../controllers/user.js');
const router = new express.Router();
const jwtAuthenticator = require('../components/middleware/jwtAuthenticator');
const ipExtractor = require('../components/middleware/ipExtractor');

const getProfile = require('../validators/user/getProfile.js');
const getState = require('../validators/user/getState.js');
const postProfile = require('../validators/user/postProfile.js');
const getVerify = require('../validators/user/getVerify.js');
const postVerify = require('../validators/user/postVerify.js');
const putPassword = require('../validators/user/putPassword.js');
const putResendVerify = require('../validators/user/putResendVerify.js');

router.route('/profile/').get(validate(getProfile.validate),
    jwtAuthenticator({}), userController.getProfile);
router.route('/state/').get(validate(getState.validate),
    jwtAuthenticator({getUser: true}), userController.getState);
router.route('/profile/').post(validate(postProfile.validate),
    jwtAuthenticator({}), userController.postProfile);
router.route('/verify/').get(validate(getVerify.validate),
    ipExtractor({useWorbliUser: true}), userController.getVerify);
router.route('/verify/').post(validate(postVerify.validate),
    ipExtractor({useWorbliUser: true}), userController.postVerify);
router.route('/password/').put(validate(putPassword.validate),
    ipExtractor({useWorbliUser: true}), userController.putPassword);
router.route('/resendverify/').put(validate(putResendVerify.validate),
    userController.putResendVerify);

module.exports = router;
