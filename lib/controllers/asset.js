'use strict';

var cip = require('../services/natmus-cip');
var es = require('../services/elasticsearch');
var cipCategories = require('../cip-categories.js');
var assetPlayer = require('../asset-player.js');
var licenseMapping = require('../config/license-mapping.json');
var assetLayout = require('../asset-layout.js');
var config = require('../config/config');

var helpers = {};

helpers.licenseTag = function(licenseId) {
  return licenseMapping[licenseId];
};

helpers.magic360Options = function(imageRotationSet) {
  var smallImages = imageRotationSet.small;
  var largeImages = imageRotationSet.large;
  var options = {
    'magnifier-shape': 'circle',
    'magnifier-width': '100%',
    'columns': smallImages.length,
    'images': smallImages.join(' '),
    'large-images': largeImages.join(' ')
  };
  var result = '';
  for (var o in options) {
    result += o + ': ' + options[o] + '; ';
  }
  return result;
};

exports.index = function(req, res, next) {
  // Remove any query string or trailing slashes from the url.
  var url = req.url.split('?').shift().replace(/\/$/,'');

  var catalogAlias = req.params.catalog;
  var id = req.params.id;
  var esId = catalogAlias + '-' + id;

  es.getSource({
    index: config.esAssetsIndex,
    type: 'asset',
    id: esId
  }).then(function(metadata) {
    var reviewState = metadata.review_state ?
                      metadata.review_state.id :
                      null;
    if (reviewState !== 3 && reviewState !== 4) {
      var err = new Error('Not reviewed for public access.');
      err.status = 404;
      throw err;
    } else {
      return metadata;
    }
  })
  .then(function(metadata) {
    var relatedAssets = [].concat(metadata.related_sub_assets,
                                  metadata.related_master_assets);
    if (relatedAssets.length === 0) {
      metadata.relatedAssets = [];
      return metadata;
    } else {
      var relatedAssetById = {};
      // Parse related assets to descriptions of documents to fetch.
      relatedAssets.forEach(function(asset) {
        relatedAssetById[catalogAlias + '-' + asset.id] = asset;
      });

      return es.mget({
        'index': config.esAssetsIndex,
        'type': 'asset',
        '_source_include': ['review_state'],
        'body': {
          'ids': Object.keys(relatedAssetById)
        }
      }).then(function(response) {
        metadata.relatedAssets = response.docs.filter(function(asset) {
          if (asset.found) {
            var reviewState = asset._source.review_state ?
                              asset._source.review_state.id :
                              null;
            // Reviewed for public access.
            return reviewState === 3 || reviewState === 4;
          } else {
            return false;
          }
        }).map(function(asset) {
          return relatedAssetById[asset._id];
        });
        return metadata;
      });
    }
  })
  .then(function(metadata) {
    metadata.relatedAssets.forEach(function(asset) {
      asset.src = '/' + [metadata.catalog, asset.id,'image',300].join('/');
      asset.href = '/' + [metadata.catalog, asset.id].join('/');
    });

    var player = assetPlayer.determinePlayer(metadata);

    var categoriesRaw = req.app.get('categories')[catalogAlias];
    var categories = cipCategories.formatCategories(categoriesRaw,
                                                    metadata.categories);
    var catalog = cip.findCatalog(req.app.get('catalogs'), catalogAlias);

    // Split up the visible and additional assets.
    var relatedAssets = {
      visible: metadata.relatedAssets.slice(0, 4),
      additional: metadata.relatedAssets.slice(4)
    };

    var showGeotagging = false;
    var showCallToAction = false;
    var noNatmusGeotag = false;
    if (config.enableGeotagging) {
      showGeotagging = !metadata.google_maps_coordinates;
      noNatmusGeotag = !metadata.latitude && !metadata.longitude;
      showCallToAction = showGeotagging && noNatmusGeotag;
    }

    return {
      'id': esId,
      'metadata': metadata,
      'assetLayout': assetLayout({
        'showGeotagging': showGeotagging,
        'catalogs': req.app.get('catalogs')
      }),
      'categories': categories,
      'catalog': catalog,
      'player': player,
      'relatedAssets': relatedAssets,
      'showGeotagging': showGeotagging,
      'showCallToAction': showCallToAction,
      'helpers': helpers,
      'sources': assetPlayer.generateSources(req, player, url, metadata),
      'req': req
    };
  })
  .then(function(renderParameters) {
    if (renderParameters) {
      res.render('asset.jade', renderParameters);
    }
  })
  .then(undefined, function(error) {
    if (error.message === 'Not Found') {
      error.status = 404;
    }
    next(error);
  });
};
