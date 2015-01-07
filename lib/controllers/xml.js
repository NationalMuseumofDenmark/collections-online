/*jshint multistr: true */

var elasticsearch = require('elasticsearch');
var querystring = require('querystring');

var license_mapping = require('../license-mapping.js');


exports.sitemap = function sitemap(req, res) {
    var es_client = req.app.get('es_client');
    var host_base = req.headers.host;
    var catalog = req.params.catalog;
    var offset = req.param('offset');

    var query = {
        index:'assets',
        size:20000,
        from:0,
        body:{}
    };

    if(offset && offset !== undefined) {
        query.from = parseInt(offset) * 20000;
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
    });
};
