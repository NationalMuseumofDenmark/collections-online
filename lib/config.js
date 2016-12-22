'use strict';

const path = require('path');
const _ = require('lodash');
const rootPath = path.normalize(path.join(__dirname, '..'));
const defaultAppPath = path.join(rootPath, 'app');

const CLIENT_SIDE_KEYS = [
  'es',
  'features',
  'googleAnalyticsPropertyID',
  'translations',
  'search',
  'sortOptions',
  'types'
];

// Default config parameters goes here
const defaults = {
  allowRobots: true,
  root: rootPath,
  appName: 'Collections Online',
  search: {
    path: 'search'
  },
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
