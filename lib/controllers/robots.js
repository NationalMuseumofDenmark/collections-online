'use strict';

var config = require('../config');

exports.robotsTxt = function(req, res) {
  res.type('text/plain');

  var lines = [];
  if (config.allowRobots) {
    lines = [
      'User-agent: *',
      'Allow: *',
      'Disallow: /*/infinite'
    ];
  } else {
    lines = [
      'User-agent: *',
      'Disallow: /'
    ];
  }
  res.send(lines.join('\n'));
};
