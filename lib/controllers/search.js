'use strict';

var elasticsearch = require('elasticsearch');
var helpers = {};

function generate_pagination(offset, total_results) {
  var page_size = 50;
  var real_offset = 0;
  var result = [];

  if(parseInt(offset) > 0) {
      real_offset = parseInt(offset) / page_size;
  }

  var start_val = real_offset > 5 ? real_offset - 5 : 0;
  var end_val = real_offset > 5 ? real_offset + 5 : 10;

  if(end_val*page_size > total_results) {
      end_val = total_results / page_size;
  }

  for(var i=start_val; i < end_val; i++) {
      result.push(i);
  }

  return result;
}

function search(es_client, params, freetext, offset, callback) {
  var query = {
    index: 'assets',
    size: 50,
    from: offset,
    body: {}
  };


  query.body = {
      filter: {
          and: []
      }
  };

  if(Object.keys(params).length > 0) {
      query.body.filter.and.push(
          {
              query: { match: params }
          }
      );
  }

  if(freetext !== undefined) {
      query.body.filter.and.push(
          {
              query: {
                  query_string: {
                      query: "_all:*" + freetext + "*"
                  }
              }
          }
      );
  }

  if(query.body.filter.and.length == 0) {
      delete query.body.filter.and;
  }

  es_client.search(query).then(function (resp) {
    var results = [];
    var temp_results = resp.hits.hits;
    var total_results = resp.hits.total;

    for(var i=0; i < temp_results.length; ++i) {
        results.push(temp_results[i]._source);
    }
    callback(results, offset, total_results);
  });
}

helpers.asset_url = function asset_url(result) {
  return '/' + result.catalog + '/' + result.id;
}

helpers.thumbnail_url = function thumbnail_url(result) {
  return '/' + result.catalog + '/' + result.id + '/thumbnail';
};

exports.catalog = function catalog(req, res) {
    var freetext = req.param('q');
    var offset = req.param('offset');
    search(
        req.app.get('es_client'),
        {catalog: req.params.catalog},
        freetext,
        offset,
        function(results, offset, total_results) {
            var pagination = generate_pagination(offset, total_results);

            res.render(
                'search',
                {
                    results: results,
                    helpers: helpers,
                    req:req,
                    pagination:pagination
                }
            );
        }
    );
};

exports.index = function index(req, res) {
    var freetext = req.param('q');
    var offset = req.param('offset');

    search(
        req.app.get('es_client'),
        {},
        freetext,
        offset,
        function(results, offset, total_results) {
            var pagination = generate_pagination(offset, total_results);

            res.render(
                'search',
                {
                    results: results,
                    helpers: helpers,
                    req:req,
                    pagination:pagination
                }
            );
        }
    );
};
