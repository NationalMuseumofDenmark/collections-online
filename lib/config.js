'use strict';

const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const defaultAppPath = path.normalize(path.join(__dirname, '..', 'app'));

// Default config parameters goes here
var defaults = {
  allowRobots: true,
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

config.setChildPath = (childPath) => {
  config.childPath = childPath;
  config.reload();
};

config.reload = () => {
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
