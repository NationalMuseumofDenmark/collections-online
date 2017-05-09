'use strict';

const assert = require('assert');

const config = require('../config');
assert.ok(config.search.path, 'Expected the config.search.path');

exports.robotsTxt = function(req, res) {
  res.type('text/plain');

  var lines = [];
  if (config.allowRobots) {
    lines = [
      'User-agent: *',
      'Allow: *',
      'Disallow: /?q',
      'Disallow: /' + config.search.path,
    ];
  } else {
    lines = [
      'User-agent: *',
      'Disallow: *'
    ];
  }
  res.send(lines.join('\n'));
};
