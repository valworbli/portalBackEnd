const express = require('express');
const validate = require('express-validation');
const networkController = require('../controllers/network.js');
const router = new express.Router();
const jwtAuthenticator = require('../components/jwtAuthenticator');

const postAccount = require('../validators/network/postAccount.js');
const getCheck = require('../validators/network/getCheck.js');

router.route('/account/').post(validate(postAccount.validate),
    jwtAuthenticator({}), networkController.postAccount);
router.route('/check/:accountName').get(validate(getCheck.validate),
    jwtAuthenticator({}), networkController.getCheck);

module.exports = router;
