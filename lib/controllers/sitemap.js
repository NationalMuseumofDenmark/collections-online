/*jshint multistr: true */

const querystring = require('querystring');
const ds = require('../services/documents');
const config = require('../config');
const helpers = require('../../shared/helpers');

const licenseMapping = require('../config').licenseMapping;

const SITEMAP_ASSET_LIMIT = 1000;

// One sitemap.xml file for crawlers, which points to all our sub sitemaps
exports.index = function(req, res, next) {
  var hostBase = req.headers['x-forwarded-host'] || req.get('host');

  ds.search({
    'size':0,
    'body': {
      'aggs': {
        'searchable': {
          'filter': config.search.baseQuery || {},
          'aggs': {
            'collection': {
              'terms': {'field': 'collection.keyword'},
              'aggs': {
                'maximalId': {
                  'max': {'field': 'id'}
                }
              }
            }
          }
        }
      }
    }
  }).then(function(response) {
    let sitemaps = [];
    let collections = response.aggregations.searchable.collection.buckets;
    collections.forEach(collection => {
      let maximalId = collection.maximalId.value;
      var sitemapCount = Math.ceil(maximalId / SITEMAP_ASSET_LIMIT);
      for (var i=0; i < maximalId; i+=SITEMAP_ASSET_LIMIT) {
        var baseUrl = 'http://' + hostBase + '/';
        let qs = querystring.stringify({
          fromId: i,
          toId: i + SITEMAP_ASSET_LIMIT
        });
        let path = collection.key + '/sitemap.xml?' + qs;
        sitemaps.push({
          location: baseUrl + path
        });
      }
    });
    res.header('Content-type', 'text/xml; charset=utf-8');
    res.render('sitemap', {
      sitemaps
    });
  }).then(null, next);
};

exports.catalog = function(req, res, next) {
  var hostBase = req.headers['x-forwarded-host'] || req.get('host');
  var collection = req.params.catalog;
  var fromId = parseInt(req.query.fromId, 10) || 0;
  var toId = parseInt(req.query.toId, 10) || (fromId + SITEMAP_ASSET_LIMIT);

  if (!collection) {
    throw new Error('No catalog specified');
  }

  var parameters = {
    'body': {
      'size': SITEMAP_ASSET_LIMIT,
      'query': {
        'bool': {
          'must': [
            {
              'range': {
                'id': {
                  'gte': fromId,
                  'lt': toId
                }
              }
            }, {
              'match': {
                'collection': collection
              }
            }
          ]
        }
      }
    }
  };

  if(config.search && config.search.baseQuery) {
    parameters.body.query.bool.must.push(config.search.baseQuery);
  }

  ds.search(parameters).then(function(result) {
    var urls = [];
    for (var i=0; i < result.hits.hits.length; ++i) {
      const metadata = result.hits.hits[i]._source;
      const relativeUrl = helpers.getDocumentURL(metadata);
      const location = helpers.getAbsoluteURL(req, relativeUrl);

      // YYYY-MM-DD
      const modified = helpers.documentModified(metadata);
      const lastmod = modified ? new Date(modified).toISOString() : '';
      const elements = helpers.generateSitemapElements(req, metadata);

      urls.push({
        location,
        lastmod,
        elements
      });
    }

    res.header('Content-type', 'text/xml; charset=utf-8');
    res.render('urlset', {
      urls
    });
  }).then(null, next);
};
