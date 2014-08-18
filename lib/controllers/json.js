var elasticsearch = require('elasticsearch');
var querystring = require('querystring');
var cip = require('../cip-methods.js');

// Autosuggest for search field
exports.suggest = function suggest(req, res) {
    var es_client = req.app.get('es_client');
    var text = req.param('text');
    var query = {
        "body": {
            "suggest" : {
                "text" : text,
                "completion" : {
                    "field" : "suggest",
                    "fuzzy" : {
                        "fuzziness" : 1
                    }
                }
            }
        }
    };

    es_client.suggest(query).then(function (resp) {
        var results = [];
        var temp_results = resp.suggest;
        res.header('Content-type', 'application/json; charset=utf-8');
        res.json(resp.suggest[0].options);
    });
};
