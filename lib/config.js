'use strict';

var path = require('path');
var rootPath = path.normalize(__dirname + '/..');

var config = {
  root: rootPath
};

config.set = function(config) {
  for (var s in config) {
    this[s] = config[s];
  }
  return this;
};

module.exports = config;
