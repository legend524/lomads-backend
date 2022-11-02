const express = require('express');
const utilityCtrl = require('./utility.controller');
const web3Auth = require('@server/services/web3Auth');

const router = express.Router(); // eslint-disable-line new-cap

router.post('/upload-url', web3Auth, utilityCtrl.getUploadURL);
router.post('/check-lomads-bot', web3Auth, utilityCtrl.checkLomadsBot)

module.exports = router;
