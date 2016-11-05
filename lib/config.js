'use strict';

var path = require('path');
var _ = require('lodash');
var rootPath = path.normalize(path.join(__dirname, '..'));
var defaultAppPath = path.join(rootPath, 'app');

// Default config parameters goes here
var defaults = {
  root: rootPath,
  searchPath: 'search',
  types: {
    asset: {
      router: 'collections-online/lib/routers/asset'
    }
  }
};

function override(config) {
  config.appPaths = _.concat(config.appPaths, defaultAppPath);
}

var config = {};

config.set = (newConfig) => {
  _.merge(config, defaults, newConfig);
  override(config);
};

module.exports = config;
