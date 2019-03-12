const express = require('express');
const validate = require('express-validation');
const userController = require('../controllers/user.js');
const router = new express.Router();

const getProfile = require('../validators/user/getProfile.js');
const getState = require('../validators/user/getState.js');
const postProfile = require('../validators/user/postProfile.js');
const getVerify = require('../validators/user/getVerify.js');
const postVerify = require('../validators/user/postVerify.js');

router.route('/profile/').get(validate(getProfile.validate),
    userController.getProfile);
router.route('/state/').get(validate(getState.validate),
    userController.getState);
router.route('/profile/').post(validate(postProfile.validate),
    userController.postProfile);
router.route('/verify/').get(validate(getVerify.validate),
    userController.getVerify);
router.route('/verify/').post(validate(postVerify.validate),
    userController.postVerify);

module.exports = router;
