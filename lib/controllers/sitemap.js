/*jshint multistr: true */

const querystring = require('querystring');
const ds = require('../services/documents');
const config = require('../config');
const helpers = require('../../shared/helpers');

const licenseMapping = require('../config').licenseMapping;

const SITEMAP_ASSET_LIMIT = 1000;

// One sitemap.xml file for crawlers, which points to all our sub sitemaps
exports.index = function(req, res, next) {
  var host_base = req.headers['x-forwarded-host'] || req.get('host');

  ds.search({
    'size':0,
    body: {
      'aggs': {
        'searchable': {
          'filter': config.search.baseQuery || {},
          'aggs': {
            'collection': {
              'terms': {'field': 'collection.keyword'}
            }
          }
        }
      }
    }
  }).then(function(response) {
    let sitemaps = [];
    let collections = response.aggregations.searchable.collection.buckets;
    collections.forEach(collection => {
      // TODO: Aggregate the maximal id for every collection
      let maximalId = 100;
      var sitemapCount = Math.ceil(maximalId / SITEMAP_ASSET_LIMIT);
      for (var i=0; i < maximalId; i+=SITEMAP_ASSET_LIMIT) {
        var baseUrl = 'http://' + host_base + '/';
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
  var host_base = req.headers['x-forwarded-host'] || req.get('host');
  var collection = req.params.catalog;
  var fromId = parseInt(req.query.fromId, 10) || 0;
  var toId = parseInt(req.query.toId, 10) || (fromId + SITEMAP_ASSET_LIMIT);

  if (!collection) {
    throw new Error('No catalog specified');
  }

  var parameters = {
    'size': SITEMAP_ASSET_LIMIT,
    'body': {
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
      const source = result.hits.hits[i]._source;
      const collection = source.collection;
      const title = helpers.documentTitle(source);
      const description = helpers.documentDescription(source);
      const id = source.id;

      let license = helpers.licenseMapped(source);
      let licenseUrl = license ? license.url : null;

      var location = 'http://' + host_base + '/' + collection + '/' + id;

      // YYYY-MM-DD
      var modificationTime = helpers.documentModified(source);
      var lastmod = new Date(modificationTime).toISOString();

      urls.push({
        location,
        lastmod,
        title,
        description,
        licenseUrl
      });
    }

    res.header('Content-type', 'text/xml; charset=utf-8');
    res.render('urlset', {
      urls
    });
  }).then(null, next);
};
