var elasticsearch = require('elasticsearch');

exports.sitemap = function sitemap(req, res) {
    var es_client = req.app.get('es_client');
    var host_base = req.headers.host;

    es_client.search({index:'assets', size:100000}).then(function(search_result) {
        var sitemap = '<?xml version="1.0" encoding="UTF-8"?> \
                    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" \
                            xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" \
                            xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">';

        for(var i=0; i < search_result.hits.hits.length; ++i) {
            var source = search_result.hits.hits[i]._source;
            var catalog = source.catalog;
            var id = source.id;
            var url = 'http://' + host_base + '/' + catalog + '/' + id;

            var sitemap_entry = '<url>\n \
                <loc>' + url + '</loc>\n \
                <image:image>\n \
                  <image:loc>http://' + url + '/image/1200</image:loc>\n \
                </image:image>\n \
            </url>';

            sitemap += sitemap_entry;
        }

        sitemap += '</urlset>';
        res.header('Content-type', 'text/xml; charset=utf-8');
        res.send(sitemap);
    });
};
