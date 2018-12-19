const express = require('express');
const adminController = require('../controllers/admin.js');
const validate = require('express-validation');
const router = new express.Router();

const adminPostLogin = require('./validators/adminPostLogin.js');
const adminPostAuth = require('./validators/adminPostAuth.js');

router.route('/login/').post(
    validate(adminPostLogin.validate), adminController.postLogin);

router.route('/auth/').post(
    validate(adminPostAuth.validate), adminController.postAuth);

module.exports = router;
