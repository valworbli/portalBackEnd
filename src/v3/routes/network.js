const express = require('express');
const validate = require('express-validation');
const networkController = require('../controllers/network.js');
const router = new express.Router();

const postAccount = require('../validators/network/postAccount.js');
const getCheck = require('../validators/network/getCheck.js');

router.route('/account/').get(validate(postAccount.validate),
    networkController.postAccount);
router.route('/check/').post(validate(getCheck.validate),
    networkController.getCheck);

module.exports = router;
