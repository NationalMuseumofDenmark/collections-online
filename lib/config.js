'use strict';

/*
var _ = require('lodash');

// TODO: Use the fs package to check that this file actually exists.
if (!process.env.CONFIG_PATH) {
  throw new Error('Please specify a CONFIG_PATH environment variable, ' +
                  'that will point to a directory of configuration files.');
}

// TODO: Prepend the value of process.env.CONFIG_PATH to the following requires
if (process.env.NODE_ENV) {
  console.log('Loading ' + process.env.NODE_ENV + ' configuration');
  var environmentConfig = require('./env/' + process.env.NODE_ENV + '.js');
} else {
  throw new Error('Please specify a NODE_ENV environment variable.');
}

/**
 * Load environment configuration
 * /
module.exports = _.merge(
  require('./env/all.js'),
  environmentConfig || {});
*/

var config = {};

config.set = function(config) {
  for (var s in config) {
    this[s] = config[s];
  }
  return this;
};

module.exports = config;
