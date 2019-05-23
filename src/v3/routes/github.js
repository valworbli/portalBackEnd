/* eslint max-len: 0 */
const express = require('express');
const validate = require('express-validation');
const githubController = require('../controllers/github.js');
const router = new express.Router();

const postGithub = require('../validators/github/postWebhook.js');

router.route('/webhook/').post(validate(postGithub.validate),
    githubController.postWebhook);

module.exports = router;
