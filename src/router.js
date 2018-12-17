const express = require('express');
const emailRoutes = require('./v1/routes/email.js');
const userRoutes = require('./v1/routes/user.js');
const kycRoutes = require('./v1/routes/kyc.js');
const loggerRoutes = require('./v1/routes/logger.js');
const healthRoutes = require('./v1/routes/health.js');
const router = new express.Router();

router.use('/api/v1/email', emailRoutes);
router.use('/api/v1/user', userRoutes);
router.use('/api/v1/kyc', kycRoutes);
router.use('/api/v1/logger', loggerRoutes);
router.use('/api/v1/health', healthRoutes);

module.exports = router;
