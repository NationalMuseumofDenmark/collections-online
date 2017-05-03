'use strict';
var express = require('express');
var config = require('../config');
var asset = require('../controllers/types/asset');
var images = require('../controllers/images');

var router = express.Router({
  mergeParams: true
});

// Register routes for downloading and thumbnailing on the asset router.
router
  .get('/download', images.download)
  .get('/download/:size', images.download)
  .get('/download/:size/:filename', images.download)
  .get('/thumbnail', images.thumbnail)
  .get('/thumbnail/:size(\\d+)', images.thumbnail)
  .get('/thumbnail/:size(\\d+)/:position([a-z\\-]+)', images.thumbnail);

router.get('/', asset.index);

if(config.features.motifTagging) {
  const motifTagging = require('../controllers/motif-tagging');
  router.get('/suggested-motif-tags', motifTagging.suggestions);
  router.post('/save-motif-tags', motifTagging.save);
}

if(config.features.geoTagging) {
  const geoTagging = require('../controllers/geo-tagging');
  router.post('/save-geotag', geoTagging.save);
}

if(config.features.feedback) {
  const feedback = require('../controllers/feedback');
  router.post('/feedback', feedback.save);
}

module.exports = router;
