'use strict';

var ds = require('../services/documents');
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

  const indecies = Object.keys(config.types).map((type) => {
    return config.types[type].index;
  });

  for (var i = 0; i < catalogs.length; i++) {
    catalog = catalogs[i];
    catalogIndex[catalog['alias']] = catalog;

    mquery.push({index: indecies, size: 1});
    mquery.push({
      sort: [
          {'meta.modified': 'desc'}
      ],
      filter: {
        and: [{
          query: {match: {'meta.rating': 5}},
        }, {
          query: {match: {'collection': catalog.alias}},
        }, {
          query: {match: {'file.mediaType': 'image/tiff'}},
        }/*, {
          query: {match: {'is_searchable': true}}
        }*/]
      }
    });
  }

  var totalAssets = 0;

  ds.search({
    index: indecies,
    // body: {query: {match: {'is_searchable': true}}}
  }).then(function(resp) {
    totalAssets = resp.hits.total;
    return ds.msearch({body: mquery});
  }).then(function(resp) {
    var results = resp.responses.map(function(response) {
      if(response.error) {
        throw new Error(JSON.stringify(response.error));
      }
      var hits = response.hits.hits;
      if (hits.length > 0) {
        var metadata = hits[0]._source;
        var catalog = catalogIndex[metadata.collection];
        // Add asset to the url string if we have more than one type
        var hasTypeMaybe = '';
        if(Object.keys(config.types).length > 1) {
          hasTypeMaybe = '/asset';
        }
        var url = `/${metadata.collection}${hasTypeMaybe}/${metadata.id}`;
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
