'use strict';

var config = require('../config');
var vision = require('node-cloud-vision-api');
var translate = require('google-translate')(config.googleAPIKey);

vision.init({
  auth: config.googleAPIKey
});

module.exports  = {
  vision: vision,
  translate: translate
};
