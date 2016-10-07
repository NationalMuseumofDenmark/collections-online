'use strict';
var plugins = require('../../plugins');

var imageController = plugins.getFirst('image-controller');
if(!imageController) {
  throw new Error('Expected at least one image controller!');
}

module.exports = imageController;
