const express = require('express');
const healthController = require('../controllers/health.js');
const router = new express.Router();

router.route('/check/').get(healthController.getCheck);

module.exports = router;
