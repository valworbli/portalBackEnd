const express = require('express');
const validate = require('express-validation');
const kycController = require('../controllers/kyc.js');
const router = new express.Router();

const postApplicant = require('../validators/kyc/postApplicant.js');

router.route('/applicant/').post(
    validate(postApplicant.validate), kycController.postApplicant);
router.route('/applicant/').get(
    kycController.getApplicant);
router.route('/check/').get(
    kycController.getCheck);
router.route('/status/').get(
    kycController.getStatus);
router.route('/webhook/').post(
    kycController.postWebhook);
router.route('/dossier/').post(kycController.postDossier);
router.route('/img/').get(kycController.getImage);
router.route('/requirements/').get(kycController.getRequirements);

module.exports = router;
