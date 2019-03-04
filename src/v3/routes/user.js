const express = require('express');
const validate = require('express-validation');
const userController = require('../controllers/user.js');
const router = new express.Router();

const getProfile = require('../validators/user/getProfile.js');
const getState = require('../validators/user/getState.js');
const postProfile = require('../validators/user/postProfile.js');

router.route('/profile/').get(validate(getProfile.validate),
    userController.getProfile);
router.route('/state/').get(validate(getState.validate),
    userController.getState);
router.route('/profile/').post(validate(postProfile.validate),
    userController.postProfile);

module.exports = router;
