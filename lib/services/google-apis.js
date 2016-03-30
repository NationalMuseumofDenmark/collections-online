'use strict';

var config = require('../config/config.js'),
    vision = require('node-cloud-vision-api'),
    translate = require('google-translate')(config.googleAPIKey);

vision.init({
  auth: config.googleAPIKey
});

module.exports  = {
  vision: vision,
  translate: translate
};
