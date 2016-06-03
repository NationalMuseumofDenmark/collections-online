'use strict';

var config = require('../config');

exports.robotsTxt = function(req, res) {
  res.type('text/plain');

  var lines = [];
  if (config.env === 'production') {
    lines = [
      'User-agent: *',
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
