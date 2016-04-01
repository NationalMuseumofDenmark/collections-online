'use strict';

var path = require('path');
var rootPath = path.normalize(__dirname + '/../../..');

var categoryBlacklist = require('../category-blacklist.js');

const REVIEW_STATE_FIELD = '{a493be21-0f70-4cae-9394-703eca848bad}';

module.exports = {
  root: rootPath,
  ip:   process.env.IP || '0.0.0.0',
  port: process.env.PORT || 9000,
  cip: {
    baseURL: 'http://cumulus.natmus.dk/CIP',
    username: process.env.CIP_USERNAME,
    password: process.env.CIP_PASSWORD,
    proxyMaxSockets: 10,
    rotationCategoryName: 'Rotationsbilleder',
    indexingRestriction: REVIEW_STATE_FIELD + ' is 3'
  },
  googleAnalyticsPropertyID: null,
  googleMapsAPIKey: 'AIzaSyCkoZ8EB9Vf5SfXUzMY6bewq6diets-pxU',
  googleAPIKey: process.env.GOOGLE_API_KEY,
  projectOxfordAPIKey: process.env.PROJECT_OXFORD_API_KEY,
  esHost: process.env.ES_HOST || 'localhost:9200',
  esAssetsIndex: process.env.ES_ASSETS_INDEX || 'assets',
  categoryBlacklist: categoryBlacklist,
  natmusApiBaseURL: 'http://testapi.natmus.dk/',
  natmusApiVersion: 1,
  natmusApiMaxSockets: 10,
  enableGeotagging: true,
  sortOptions: require('../sort-options.json'),
  assetFields: require('../asset-fields.json'),
  assetLayout: require('../asset-layout.json')
};
