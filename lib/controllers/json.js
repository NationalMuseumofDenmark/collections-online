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
            "term" : {
              "field" : "categories_str",
              "suggest_mode": "always"
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

// Retrieve the main menu async & render server side
exports.mainmenu = function(req, res) {
  // Grab categories, i.e. second level in the menu
  var categories = req.app.get('cip_categories');

  // Grab the catalogs, i.e. first level in the menu
  var catalogs = req.app.get('cip_catalogs');
  var results = [];

  catalogs = catalogs.sort(function(x,y) { return x.name.localeCompare(y.name); });

  for(var i=0; i < catalogs.length; ++i) {
      if(catalogs[i].alias == undefined)
          continue;

      var children = categories[catalogs[i].alias].tree;

      results.push({
          name: catalogs[i].name,
          alias: catalogs[i].alias,
          children: children
      });
  }
  // res.json(results);
  res.render('components/main-menu', {
    results: results
  });
};
