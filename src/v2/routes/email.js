const express = require('express');
const validate = require('express-validation');
const emailController = require('../controllers/email.js');
const router = new express.Router();

const postAuthorize = require('../validators/email/postAuthorize.js');
const postReset = require('../validators/email/postReset.js');


router.route('/authorize/').post(
    validate(postAuthorize.validate), emailController.postAuthorize);
router.route('/reset/').post(
    validate(postReset.validate), emailController.postReset);

module.exports = router;


