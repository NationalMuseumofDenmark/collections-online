'use strict';

/**
 * This controller handles trigger requests from the Cumulus system that fires
 * when assets are updated, inserted or deleted.
 *
 * An example request is:
 *
 * req.body = {
 *   id: 'FHM-25757',
 *   action: 'asset-update',
 *   collection: 'Frihedsmuseet',
 *   apiKey: ''
 * }
 */

var runIndexing = require('../../indexing/modes/run');
var es = require('../services/elasticsearch');
var config = require('../config');
var assetPlayer = require('../asset-player');

var helpers = {
  thousandsSeparator: function(number) {
    return number.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1.');
  }
};

function updateAsset(catalogs, categories, assetId) {
  var state = {
    'es': es,
    'index': config.esAssetsIndex,
    'catalogs': catalogs,
    'categories': categories,
    'mode': 'single',
    'reference': assetId
  };

  return runIndexing(state);
}

function deleteAsset(req, assetId) {
  return es.delete({
    index: config.esAssetsIndex,
    type: 'asset',
    id: assetId
  });
}

exports.asset = function(req, res, next) {
  var id = req.body.id || null;
  var action = req.body.action || null;
  var catalogs = req.app.get('catalogs');
  var categories = req.app.get('categories');

  console.log('Index asset called with body =', req.body);

  function success() {
    res.json({
      'success': true
    });
  }

  if (id && action) {
    if (action === 'asset-update') {
      updateAsset(catalogs, categories, id).then(success, next);
    } else if (action === 'asset-create') {
      updateAsset(catalogs, categories, id).then(success, next);
    } else if (action === 'asset-delete') {
      deleteAsset(req, id).then(success, next);
    } else {
      next(new Error('Unexpected action from Cumulus: ' + action));
    }
  } else {
    var requestBody = JSON.stringify(req.body);
    next(new Error('Missing an id or an action, requested: ' + requestBody));
  }
};

exports.frontpage = function(req, res, next) {
  var catalogs = req.app.get('catalogs');

  var mquery = [];
  var catalog = null;

  var catalogIndex = {};

  for (var i = 0; i < catalogs.length; i++) {
    catalog = catalogs[i];
    catalogIndex[catalog['alias']] = catalog;

    mquery.push({index: config.esAssetsIndex, size: 1});
    mquery.push({
      sort: [
          {'modification_time.timestamp': 'desc'}
      ],
      filter: {
        and: [{
          query: {match: {'rating.id': 5}},
        }, {
          query: {match: {'catalog': catalog.alias}},
        }, {
          query: {match: {'file_format': 'TIFF Image'}},
        }, {
          query: {match: {'is_searchable': true}}
        }]
      }
    });
  }

  var totalAssets = 0;

  es.search({
    index: config.esAssetsIndex,
    body: {query: {match: {'is_searchable': true}}}
  }).then(function(resp) {
    totalAssets = resp.hits.total;
    return es.msearch({body: mquery});
  }).then(function(resp) {
    var results = resp.responses.map(function(hit) {
      var hits = hit.hits.hits;
      if (hits.length > 0) {
        var metadata = hits[0]._source;
        var catalog = catalogIndex[metadata.catalog];
        var url = '/' + metadata.catalog + '/' + metadata.id;
        return {
          name: catalog.name,
          alias: catalog.alias,
          sources: assetPlayer.generateSources(null, 'image-single', url,
                                               metadata)
        };
      } else {
        return null;
      }
    });

    return results;
  }).then(function(catalogs) {
    res.render('frontpage', {
      frontpage: true,
      totalAssets: helpers.thousandsSeparator(totalAssets),
      catalogs: catalogs,
      req: req
    });
  }, next);
};
