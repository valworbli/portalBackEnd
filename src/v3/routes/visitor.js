const express = require('express');
const validate = require('express-validation');
const visitorController = require('../controllers/visitor.js');
const router = new express.Router();

const postSignin = require('../validators/visitor/postSignin.js');
const postJoin = require('../validators/visitor/postJoin.js');
const postForgot = require('../validators/visitor/postForgot.js');
const postForgotToken = require('../validators/visitor/postForgotToken.js');

router.route('/signin/').post(validate(postSignin.validate),
    visitorController.postSignin);
router.route('/join/').post(validate(postJoin.validate),
    visitorController.postJoin);
router.route('/forgot/').post(validate(postForgot.validate),
    visitorController.postForgot);
router.route('/forgottoken/').post(validate(postForgotToken.validate),
    visitorController.postForgotToken);

module.exports = router;
