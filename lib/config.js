'use strict';

const path = require('path');
const _ = require('lodash');
const rootPath = path.normalize(path.join(__dirname, '..'));
const defaultAppPath = path.join(rootPath, 'app');

const CLIENT_SIDE_KEYS = [
  'auth0',
  'es',
  'features',
  'geoTagging',
  'search',
  'siteSubTitle',
  'siteTitle',
  'sortOptions',
  'themeColor',
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

config.setCustomizationPath = (customizationPath) => {
  config.customizationPath = customizationPath;
  config.reload();
};

config.getClientSideConfig = () => {
  // Copy over the values that are not confidential
  let result = {};
  CLIENT_SIDE_KEYS.forEach(key => {
    result[key] = config[key];
  });
  return result;
};

config.setClientSideConfig = (clientSideConfig) => {
  // Merge in the client side config
  _.merge(config, clientSideConfig);
};

config.reload = () => {
  const fs = require('fs');
  const path = require('path');
  // Check pre-conditions
  if(!config.customizationPath) {
    throw new Error('Call setCustomizationPath before re-loading');
  }
  let configPath = path.join(config.customizationPath, 'config.js');
  if(!fs.existsSync(configPath)) {
    throw new Error('Expected a configuration here: ', configPath);
  }
  // Invalidate the require cache (if any)
  Object.keys(require.cache).forEach(p => {
    if(p.indexOf(path.join(config.customizationPath, 'config')) !== -1) {
      delete require.cache[p];
    }
  });
  // Require the customization's configuration
  let customizationConfig = require(configPath);
  // Merge the existing config with defaults and customization's config
  _.merge(config, defaults, customizationConfig);
  // Override anything
  override(config);
};

module.exports = config;
