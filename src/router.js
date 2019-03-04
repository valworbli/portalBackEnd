const express = require('express');
// Version 1
const emailRoutes = require('./v1/routes/email.js');
const userRoutes = require('./v1/routes/user.js');
const kycRoutes = require('./v1/routes/kyc.js');
const loggerRoutes = require('./v1/routes/logger.js');
const healthRoutes = require('./v1/routes/health.js');
// Version 2
const visitorRoutesV2 = require('./v2/routes/visitor.js');
const userRoutesV2 = require('./v2/routes/user.js');
const kycRoutesV2 = require('./v2/routes/kyc.js');
const loggerRoutesV2 = require('./v2/routes/logger.js');
const healthRoutesV2 = require('./v2/routes/health.js');
// Version 3
const visitorRoutesV3 = require('./v3/routes/visitor.js');
const userRoutesV3 = require('./v3/routes/user.js');
const identityRoutesV3 = require('./v3/routes/identity.js');
const networkRoutesV3 = require('./v3/routes/network.js');
const healthRoutesV3 = require('./v3/routes/health.js');

const router = new express.Router();
// Version 1
router.use('/api/v1/email', emailRoutes);
router.use('/api/v1/user', userRoutes);
router.use('/api/v1/kyc', kycRoutes);
router.use('/api/v1/logger', loggerRoutes);
router.use('/api/v1/health', healthRoutes);
// Version 2
router.use('/api/v2/visitor', visitorRoutesV2);
router.use('/api/v2/user', userRoutesV2);
router.use('/api/v2/kyc', kycRoutesV2);
router.use('/api/v2/logger', loggerRoutesV2);
router.use('/api/v2/health', healthRoutesV2);
// Version 3
router.use('/api/v3/visitor', visitorRoutesV3);
router.use('/api/v3/user', userRoutesV3);
router.use('/api/v3/identity', identityRoutesV3);
router.use('/api/v3/network', networkRoutesV3);
router.use('/api/v3/health', healthRoutesV3);

module.exports = router;
