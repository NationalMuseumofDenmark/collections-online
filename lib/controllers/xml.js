/*jshint multistr: true */

var elasticsearch = require('elasticsearch');
var querystring = require('querystring');
var config = require('../config/config');

var license_mapping = require('../license-mapping.js');

var sitemap_asset_limit = 3000;

// One sitemap.xml file for crawlers, which points to all our sub sitemaps
exports.sitemap_index = function sitemap_index(req, res, next) {
  var host_base = req.headers["x-forwarded-host"] || req.get('host');
  var es_client = req.app.get('es_client');

  var sitemap = '<?xml version="1.0" encoding="UTF-8"?>' +
                '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

  es_client.search({
      index: config.es_assets_index,
      body: {
        "size":0,
        "aggs" : {
          "catalogs" : {
            "terms" : { "field" : "catalog" }
          }
        }
      }
  }).then(function(response){
    var catalog_buckets = response.aggregations.catalogs.buckets;
    for(var c in catalog_buckets) {
      var catalog = catalog_buckets[c];
      var number_of_sitemaps = Math.ceil(catalog.doc_count / sitemap_asset_limit);

      for(var i=0; i < number_of_sitemaps; i++){
        var baseUrl = 'http://' + host_base + '/';
        var sitemapPath = catalog.key.toUpperCase() + '/sitemap.xml?offset=' + i;

        sitemap += '<sitemap><loc>' + baseUrl + sitemapPath + '</loc></sitemap>';
      }

    }

    sitemap += '</sitemapindex>';

    res.header('Content-type', 'text/xml; charset=utf-8');
    res.send(sitemap);
  }, next);
};

exports.sitemap = function sitemap(req, res, next) {
    var es_client = req.app.get('es_client');
    var host_base = req.headers["x-forwarded-host"] || req.get('host');
    var catalog = req.params.catalog;
    var offset = req.param('offset');

    var query = {
        index: config.es_assets_index,
        size:sitemap_asset_limit,
        from:0,
        body:{}
    };

    if(offset && offset !== undefined) {
        query.from = parseInt(offset) * sitemap_asset_limit;
    }

    if(catalog && catalog !== undefined) {
      query.body.filter = {
          and: []
      };

      query.body.filter.and.push({
        query: {
            match: {
                catalog: catalog
            }
        }
      });

      query.body.filter.and.push({
          or: [{query: { match: {"review_state.id":  3}}},
               {query: { match: {"review_state.id":  4}}}]
      });

    }

    es_client.search(query).then(function(search_result) {
        var sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n \
                    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n \
                            xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n \
                            xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n';

        for(var i=0; i < search_result.hits.hits.length; ++i) {
            var source = search_result.hits.hits[i]._source;
            var catalog = source.catalog;
            var title = source.short_title || '';
            var description = source.description || '';
            var id = source.id;
            var license_url = '';

            if(source.license) {
                var license_id = source.license.id;
                var license_item = license_mapping.licenses[license_id];
                license_url = license_item !== null && typeof license_item !== 'undefined' ? license_item.url : '';
            }

            var url = 'http://' + host_base + '/' + catalog + '/' + id;

            var sitemap_entry = '<url>\n \
                <loc>' + url + '</loc>\n \
                <image:image>\n \
                  <image:loc>' + url + '/image/1200</image:loc>\n \
                  <image:title><![CDATA[' + title + ']]></image:title> \n \
                  <image:caption><![CDATA[' + description + ']]></image:caption> \n \
                  <image:license>' + license_url + '</image:license> \n \
                </image:image>\n \
            </url>\n';

            sitemap += sitemap_entry;
        }

        sitemap += '</urlset>';
        res.header('Content-type', 'text/xml; charset=utf-8');
        res.send(sitemap);
    }, next);
};
