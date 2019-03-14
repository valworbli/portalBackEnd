const express = require('express');
const validate = require('express-validation');
const healthController = require('../controllers/health.js');
const router = new express.Router();
const getReady = require('../validators/health/getReady');
const getLive = require('../validators/health/getLive');

router.route('/ready/').get(validate(getReady.validate),
    healthController.getReady);
router.route('/live/').get(validate(getLive.validate),
    healthController.getLive);

module.exports = router;
