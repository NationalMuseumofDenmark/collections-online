'use strict';

var es = require('../services/elasticsearch');

// Autosuggest for search field
exports.suggest = function suggest(req, res, next) {
  var text = req.query.text;
  var query = {
    'body': {
      'suggest': {
        'text': text,
        'completion': {
          'field': 'suggest',
          'fuzzy': {
            'fuzziness': 1
          }
        }
      }
    }
  };

  es.suggest(query).then(function(resp) {
    res.header('Content-type', 'application/json; charset=utf-8');
    if (resp.suggest && resp.suggest.length >= 1) {
      var suggestions = resp.suggest[0].options;
      res.json(suggestions);
    } else {
      next(new Error('Empty suggestion result from Elasticsearch.'));
    }
  }, function(err) {
    next(new Error('Error getting suggestions from Elasticsearch: ' + err));
  });
};
