var config = require('../config/config.js');

exports.robotsTxt = function(req, res) {
  res.type('text/plain');
  if(config.env === 'test') {
    res.send("User-agent: *\nDisallow: /");
  } else {
    res.send("User-agent: *\nAllow: /");
  }
};
