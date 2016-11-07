'use strict';

var es = require('../services/elasticsearch');
var config = require('../config');
var assetPlayer = require('../asset-player');

var helpers = {
  thousandsSeparator: function(number) {
    return number.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1.');
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

    mquery.push({index: config.es.assetsIndex, size: 1});
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
    index: config.es.assetsIndex,
    body: {query: {match: {'is_searchable': true}}}
  }).then(function(resp) {
    totalAssets = resp.hits.total;
    return es.msearch({body: mquery});
  }).then(function(resp) {
    var results = resp.responses.map(function(response) {
      if(response.error) {
        throw new Error(JSON.stringify(response.error));
      }
      var hits = response.hits.hits;
      if (hits.length > 0) {
        var metadata = hits[0]._source;
        var catalog = catalogIndex[metadata.catalog];
        // Add asset to the url string if we have more than one type
        var hasTypeMaybe = '';
        if(Object.keys(config.types).length > 1) {
          hasTypeMaybe = '/asset';
        }
        var url = `/${metadata.catalog}${hasTypeMaybe}/${metadata.id}`;
        return {
          name: catalog.name,
          alias: catalog.alias,
          sources: assetPlayer.generateSources(null,
                                               'image-single',
                                               url,
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
