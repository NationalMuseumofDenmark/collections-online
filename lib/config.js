'use strict';

const path = require('path');
const _ = require('lodash');
const rootPath = path.normalize(path.join(__dirname, '..'));
const defaultAppPath = path.join(rootPath, 'app');

const CLIENT_SIDE_KEYS = [
  'es',
  'features',
  'googleAnalyticsPropertyID',
  'search',
  'siteSubTitle',
  'siteTitle',
  'sortOptions',
  'translations',
  'types'
];

// Default config parameters goes here
const defaults = {
  allowRobots: true,
  keystone: {
    nav: {
      users: 'users',
      pages: 'pages',
      menus: ['menu-items'],
      galleries: ['galleries', 'gallery-items']
    }
  },
  root: rootPath,
  search: {
    path: 'search'
  },
  siteTitle: 'Collections Online',
  thumbnailSize: 350,
  types: {
    asset: {
      router: 'collections-online/lib/routers/asset'
    }
  }
};

function override(config) {
  const path = require('path');
  const defaultAppPath = path.normalize(path.join(__dirname, '..', 'app'));
  config.appPaths = _.concat(config.appPaths, defaultAppPath);
  if(config.features.keystone && config.siteTitle) {
    config.keystone.options.name = config.siteTitle;
    config.keystone.options.brand = config.siteTitle;
  }
}

var config = {};

config.setChildPath = (childPath) => {
  config.childPath = childPath;
  config.reload();
};

config.getClientSideConfig = () => {
  // Copy over the values that are not confirdential
  let result = {};
  CLIENT_SIDE_KEYS.forEach(key => {
    result[key] = config[key];
  });
  return result;
};

config.setClientSideConfig = (clientSideConfig) => {
  config = _.merge(config, clientSideConfig);
};

config.reload = () => {
  const fs = require('fs');
  const path = require('path');
  // Check pre-conditions
  if(!config.childPath) {
    throw new Error('Call setChildPath before re-loading the configuration');
  }
  let childConfigPath = path.join(config.childPath, 'config.js');
  if(!fs.existsSync(childConfigPath)) {
    throw new Error('Expected a child configuration here: ', childConfigPath);
  }
  // Invalidate the require cache (if any)
  Object.keys(require.cache).forEach(p => {
    if(p.indexOf(path.join(config.childPath, 'config')) !== -1) {
      delete require.cache[p];
    }
  });
  // Require the child configuration
  let childConfig = require(childConfigPath);
  config = _.merge(config, defaults, childConfig);
  // Override anything
  override(config);
};

module.exports = config;
