'use strict';

var path = require('path');
var rootPath = path.normalize(__dirname + '/../../..');

var categoryBlacklist = require('../category-blacklist.js');

module.exports = {
  root: rootPath,
  ip:   process.env.IP || '0.0.0.0',
  port: process.env.PORT || 9000,
  googleAnalyticsPropertyID: null,
  googleMapsAPIKey: "AIzaSyCkoZ8EB9Vf5SfXUzMY6bewq6diets-pxU",
  googleAPIKey: process.env.GOOGLE_API_KEY,
  projectOxfordAPIKey: process.env.PROJECT_OXFORD_API_KEY,
  cipRotationCategoryName: "Rotationsbilleder",
  esHost: process.env.ES_HOST || 'localhost:9200',
  esAssetsIndex: process.env.ES_ASSETS_INDEX || 'assets',
  categoryBlacklist: categoryBlacklist,
  cipProxyMaxSockets: 10,
  natmusApiBaseURL: 'http://testapi.natmus.dk/',
  natmusApiVersion: 1,
  natmusApiMaxSockets: 10,
  enableGeotagging: true,
  cipBaseURL: 'http://cumulus.natmus.dk/CIP',
};
