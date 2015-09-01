'use strict';

var path = require('path');
var rootPath = path.normalize(__dirname + '/../../..');

var categoryBlacklist = require('../category-blacklist.js');

module.exports = {
  root: rootPath,
  port: process.env.PORT || 9000,
  mongo: {
    options: {
      db: {
        safe: true
      }
    }
  },
  cip_rotation_category_name: "Rotationsbilleder",
  es_host: process.env.ES_HOST || 'localhost:9200',
  es_assets_index: process.env.ES_ASSETS_INDEX || 'assets',
  categoryBlacklist: categoryBlacklist,
  cipProxyMaxSockets: 10,
  natmusApiBaseURL: 'http://testapi.natmus.dk/',
  natmusApiVersion: 1,
  natmusApiMaxSockets: 10,
};