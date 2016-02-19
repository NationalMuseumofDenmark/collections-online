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
  googleApiKey: process.env.GOOGLE_API_KEY,
  cip_rotation_category_name: "Rotationsbilleder",
  es_host: process.env.ES_HOST || 'localhost:9200',
  es_assets_index: process.env.ES_ASSETS_INDEX || 'assets',
  categoryBlacklist: categoryBlacklist,
  cipProxyMaxSockets: 10,
  natmusApiBaseURL: 'http://testapi.natmus.dk/',
  natmusApiVersion: 1,
  natmusApiMaxSockets: 10,
  enableGeotagging: true
};
