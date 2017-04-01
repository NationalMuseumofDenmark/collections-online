const fs = require('fs');
const path = require('path');
const config = require('../config');
const SVG_SPRITE_PATH = path.join(
  config.generatedDir,
  'images',
  'icons.svg'
);

module.exports = (req, res, next) => {
  // Injects the svg sprite markup and calls the next middleware
  fs.readFile(SVG_SPRITE_PATH, {encoding: 'utf8'}, (err, data) => {
    if(err) {
      next(err);
    } else {
      res.locals.svgSprite = data;
      next();
    }
  });
};
