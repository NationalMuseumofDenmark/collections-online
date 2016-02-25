'use strict';

var cip = require('../services/natmus-cip'),
    es = require('../services/elasticsearch'),
    cipCategories = require('../cip-categories.js'),
    assetPlayer = require('../asset-player.js'),
    licenseMapping = require('../license-mapping.js'),
    config = require('../config/config');

var helpers = {};

helpers.formatNumber = function(n, decimals) {
  if (typeof(n) !== 'undefined' && n !== null) {
    return parseFloat(n).toFixed(decimals).replace('.', ',');
  } else {
    return n;
  }
};

helpers.filesizeMB = function(filesize) {
  if (filesize && filesize.value) {
    var mb = filesize.value / 1024 / 1024;
    // Formatted
    mb = helpers.formatNumber(mb, 1);
    return mb + ' MB';
  } else {
    return undefined;
  }
};

helpers.licenseTag = function(licenseId) {
  return licenseMapping.licenses[licenseId];
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

helpers.categoryByTag = function(categories, tag) {
  for (var i = 0; i < categories.length; i++) {
    for (var j = 0; j < categories[i].length; j++) {
      if (categories[i][j].name === tag) {
        return categories[i];
      }
    }
  }

  return [];
};

helpers.leafCategoryByTag = function(categories, tag) {
  for (var i = 0; i < categories.length; i++) {
    if (categories[i]) {
      for (var j = 0; j < categories[i].length; j++) {
        if (categories[i][j].name === tag) {
          var tagCategories = categories[i];
          // Return the leaf / last.
          return tagCategories[tagCategories.length - 1];
        }
      }
    }
  }
  return null;
};

helpers.getLink = function(req, path) {
  var host = req.headers['x-forwarded-host'] || req.get('host');
  return 'http://' + host + '/' + path;
};

helpers.getCategoryLink = function(req, alias, category) {
  return helpers.getLink(req, alias + '?cat=' + category.id);
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
    var relatedAssets = [].concat(metadata.related_master_assets,
                                  metadata.related_master_assets);
    if (relatedAssets.length === 0) {
      metadata.relatedAssets = [];
      return metadata;
    } else {
      var relatedAssetById = {};
      var relatedAssetIds = [];
      // Parse related assets to descriptions of documents to fetch.
      relatedAssets.forEach(function(asset) {
        relatedAssetById[asset.id] = asset;
        relatedAssetIds.push(catalogAlias + '-' + asset.id);
      });

      return es.mget({
        'index': config.esAssetsIndex,
        'type': 'asset',
        '_source_include': ['review_state'],
        'body': {
          'ids': relatedAssetIds
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
          var catalogAndId = (asset._id || '').split('-');
          if (catalogAndId.length === 2) {
            var assetId = catalogAndId[1];
            return relatedAssetById[assetId];
          } else {
            throw new Error('Expected assets returned to be "-" seperated');
          }
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
    if (config.enableGeotagging) {
      var noCoordinates = !metadata.latitude && !metadata.longitude;
      var rightCatalog = catalog.alias === 'FHM';
      showGeotagging = rightCatalog && !metadata.google_maps_coordinates;
      showCallToAction = showGeotagging && noCoordinates;
    }

    return {
      'id': esId,
      'item': metadata,
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
