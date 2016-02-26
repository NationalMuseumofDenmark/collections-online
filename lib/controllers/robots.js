'use strict';

var config = require('../config/config.js');

exports.robotsTxt = function(req, res) {
  res.type('text/plain');
  if (config.env === 'test') {
    res.send('User-agent: *\nDisallow: /');
  } else {
    var lines = [
      'User-agent: *',
      'Disallow: /*/infinite'
    ].join('\n');
    res.send(lines);
  }
};
