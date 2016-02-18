'use strict';

const config    = require('../config/config.js');
const vision    = require('node-cloud-vision-api');
const translate = require('google-translate')(config.googleApiKey);

vision.init({
  auth: config.googleApiKey
});

module.exports  = {
  vision: vision,
  translate: translate
};
