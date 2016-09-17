'use strict';

var path = require('path');
var _ = require('lodash');
var rootPath = path.normalize(path.join(__dirname, '..'));
var defaultAppPath = path.join(rootPath, 'app');

// Default config parameters goes here
var config = {
  root: rootPath,
  searchPath: 'search'
};

config.override = function() {
  this.appPaths = _.concat([], this.appPaths, defaultAppPath);
};

config.set = function(config) {
  for (var s in config) {
    this[s] = config[s];
  }
  this.override();
  return this;
};

module.exports = config;
