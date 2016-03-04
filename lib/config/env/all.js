'use strict';

var path = require('path');
var rootPath = path.normalize(__dirname + '/../../..');

var categoryBlacklist = require('../category-blacklist.js');

module.exports = {
  root: rootPath,
  ip:   process.env.IP || '0.0.0.0',
  port: process.env.PORT || 9000,
  cipBaseURL: 'http://cumulus.natmus.dk/CIP',
  cipUsername: process.env.CIP_USERNAME,
  cipPassword: process.env.CIP_PASSWORD,
  cipProxyMaxSockets: 10,
  cipRotationCategoryName: "Rotationsbilleder",
  googleAnalyticsPropertyID: null,
  googleMapsAPIKey: "AIzaSyCkoZ8EB9Vf5SfXUzMY6bewq6diets-pxU",
  googleAPIKey: process.env.GOOGLE_API_KEY,
  projectOxfordAPIKey: process.env.PROJECT_OXFORD_API_KEY,
  esHost: process.env.ES_HOST || 'localhost:9200',
  esAssetsIndex: process.env.ES_ASSETS_INDEX || 'assets',
  categoryBlacklist: categoryBlacklist,
  natmusApiBaseURL: 'http://testapi.natmus.dk/',
  natmusApiVersion: 1,
  natmusApiMaxSockets: 10,
  enableGeotagging: true
};
