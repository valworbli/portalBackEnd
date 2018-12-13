const express = require('express');
const loggerController = require('../controllers/logger.js');
const router = new express.Router();

router.route('/log/').post(loggerController.post_log);

module.exports = router;
