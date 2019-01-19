const express = require('express');
const validate = require('express-validation');
const visitorController = require('../controllers/visitor.js');
const router = new express.Router();

const postRegister = require('../validators/visitor/postRegister.js');
const postReset = require('../validators/visitor/postReset.js');
const postValidate = require('../validators/visitor/postValidate.js');
const postPassword = require('../validators/visitor/postPassword.js');

router.route('/register/').post(validate(postRegister.validate),
    visitorController.postRegister);
router.route('/validate/').post(validate(postValidate.validate),
    visitorController.postValidate);
router.route('/password/').post(validate(postPassword.validate),
    visitorController.postPassword);
router.route('/reset/').post(validate(postReset.validate),
    visitorController.postReset);
router.route('/resetpassword/').post(validate(postPassword.validate),
    visitorController.postResetPassword);

module.exports = router;
