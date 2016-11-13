/*jshint multistr: true */

const querystring = require('querystring');
const es = require('../services/elasticsearch');
const config = require('../config');

const licenseMapping = require('../config').licenseMapping;

const SITEMAP_ASSET_LIMIT = 3000;

// One sitemap.xml file for crawlers, which points to all our sub sitemaps
exports.index = function(req, res, next) {
  var host_base = req.headers['x-forwarded-host'] || req.get('host');

  es.search({
    'index': config.es.assetsIndex,
    'body': {
      'size':0,
      'aggs': {
        'searchable': {
          'filter': {
            'term': {
              'is_searchable': true
            }
          },
          'aggs': {
            'catalogs': {
              'terms': {'field': 'catalog.raw'}
            }
          }
        }
      }
    }
  }).then(function(response) {
    var sitemaps = [];
    var catalog_buckets = response.aggregations.searchable.catalogs.buckets;
    for (var c in catalog_buckets) {
      var catalog = catalog_buckets[c];
      var sitemapCount = Math.ceil(catalog.doc_count / SITEMAP_ASSET_LIMIT);

      for (var i=0; i < sitemapCount; i++){
        var baseUrl = 'http://' + host_base + '/';
        var path = catalog.key + '/sitemap.xml?offset=' + i;
        sitemaps.push({
          location: baseUrl + path
        });
      }
    }
    res.header('Content-type', 'text/xml; charset=utf-8');
    res.render('sitemap', {
      sitemaps
    });
  }).then(null, next);
};

exports.catalog = function(req, res, next) {
  var host_base = req.headers['x-forwarded-host'] || req.get('host');
  var catalog = req.params.catalog;
  var offset = parseInt(req.query.offset, 10) || 0;

  if (!catalog) {
    throw new Error('No catalog specified');
  }

  var parameters = {
    'index': config.es.assetsIndex,
    'size': SITEMAP_ASSET_LIMIT,
    'from': offset * SITEMAP_ASSET_LIMIT,
    'body': {
      'sort': [
        {'id': 'asc'}
      ]
    }
  };

  parameters.body.filter = {
    'and': []
  };

  parameters.body.filter.and.push({
    'query': {
      'match': {
        'catalog': catalog
      }
    }
  });

  parameters.body.filter.and.push({
    'query': {
      'match': {
        'is_searchable': true
      }
    }
  });

  es.search(parameters).then(function(result) {
    var urls = [];
    for (var i=0; i < result.hits.hits.length; ++i) {
      var source = result.hits.hits[i]._source;
      var catalog = source.catalog;
      var title = source.short_title || '';
      var description = source.description || '';
      var id = source.id;

      var licenseUrl = null;
      if (source.license && source.license.id) {
        var license = licenseMapping[source.license.id];
        if(license && license.url) {
          licenseUrl = license.url;
        }
      }

      var location = 'http://' + host_base + '/' + catalog + '/' + id;

      // YYYY-MM-DD
      var modificationTime = source.modification_time.timestamp;
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
  }, next);
};
