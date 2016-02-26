'use strict';

var cip = require('./services/natmus-cip');
var Q = require('q');
var config = require('./config/config');

function Categories(tree) {
  this.getPath = function(x) {
    function traverse(tree, path) {
      path.push(tree);

      if (tree.id === x) {
        return path;
      }

      for (var i = 0; i < tree.children.length; ++i) {
        var result = traverse(tree.children[i], path.slice(0));

        if (result !== null) {
          return result;
        }
      }

      return null;
    }

    return traverse(this.tree, []);
  };

  this.getNode = function(x) {
    function traverse(tree) {
      if (tree.id === x) {
        return tree;
      }

      for (var i = 0; i < tree.children.length; ++i) {
        var result = traverse(tree.children[i]);

        if (result !== null) {
          return result;
        }
      }

      return null;
    }

    return traverse(this.tree);
  };

  this.dumpTree = function(tree) {
    console.log(tree.id + ':' + tree.name);
    for (var i = 0; i < tree.children.length; ++i) {
      this.dumpTree(tree.children[i]);
    }
  };

  this.buildTree = function(tree) {
    // If the category id is in the blacklist, just return null.
    if (config.categoryBlacklist.indexOf(tree.id) !== -1) {
      return null;
    }
    // Check that the category actually has assets in it.

    var result = {
      id: tree.id,
      name: tree['Category Name'],
      children: []
    };

    if (!tree.hassubcategories) {
      return result;
    }

    for (var i = 0; i < tree.subcategories.length; ++i) {
      var subcategories = this.buildTree(tree.subcategories[i]);
      if (subcategories !== null) {
        result.children.push(subcategories);
      }
    }

    return result;
  };

  this.tree = {};
  this.tree = this.buildTree(tree);
}

exports.loadCategories = function() {
  function getCatalogCategories(catalog) {
    return catalog.getCategories(1, 'all')
    .then(function(response) {
      if (!response || !response.body) {
        throw new Error('Expected a non-empty response from the CIP service.');
      }
      var categories = new Categories(response.body);
      categories.id = catalog.alias;
      return categories;
    });
  }

  return cip.initSession().then(function(nm) {
    return cip.getCatalogs(nm).then(function(catalogs) {
      var promises = [];

      for (var i = 0; i < catalogs.length; ++i) {
        var catalog = catalogs[i];
        promises.push(getCatalogCategories(catalog));
      }

      console.log('Fetching categories for', promises.length, 'catalogs.');

      return Q.allSettled(promises).then(function(result) {
        var finalResult = [];

        for (var i = 0; i < result.length; ++i) {
          if (result[i].state === 'fulfilled') {
            finalResult.push(result[i].value);
          }
        }

        console.log('Got categories for', finalResult.length, 'catalogs.');

        if (promises.length !== finalResult.length &&
            config.env !== 'development') {
          throw new Error('Could not load categories for all the catalogs.');
        }

        return finalResult;

      });
    });
  });
};

exports.fetchCategoryCounts = function(esClient, catalogs) {

  function handleCategoryNode(categoryCounts, node) {
    var categoryCount = categoryCounts[node.id];
    if (categoryCount > 0) {
      node.count = categoryCount;
    } else {
      node.count = 0;
    }
    // Progress recursively ..
    for (var c in node.children) {
      handleCategoryNode(categoryCounts, node.children[c]);
    }
  }

  function handleEsAggregations(response) {
    var categoryCounts = {};
    var categoryAggregations = response.aggregations.catalog.categories.buckets;
    for (var f in categoryAggregations) {
      var categoryId = categoryAggregations[f].key;
      var categoryCount = categoryAggregations[f].doc_count;
      categoryCounts[categoryId] = categoryCount;
    }
    handleCategoryNode(categoryCounts, this.tree);
  }

  var promises = [];
  for (var c in catalogs) {
    var catalog = catalogs[c];
    var catalogAlias = catalog.id;

    var countPromise = esClient.search({
      index: config.esAssetsIndex,
      body: {
        'size': 0,
        'aggs': {
          'catalog': {
            'filter': {
              'and': [
                {'query': {'match': {'catalog': catalogAlias}}},
                {'query': {'match': {'is_searchable': true}}}
              ]
            },
            'aggs': {
              'categories': {
                'terms': {
                  'field': 'categories_int',
                  'size': 1000000000 // A very large number
                },
              }
            }
          }
        }
      }
    }).then(handleEsAggregations.bind(catalog));

    promises.push(countPromise);
  }

  // When all the facet searches for assets are ready.
  return Q.all(promises).then(function() {
    // Return the new catalogs with counts.
    return catalogs;
  });
};

exports.formatCategories = function(allCategories, categories) {
  var result = [];

  for (var c in categories) {
    var category = categories[c];
    if (category.path.indexOf('$Categories') === 0 && category.id !== 1) {
      result.push(allCategories.getPath(category.id));
    }
  }

  // Sort by lexicographical order of the concatinated names.
  result.sort(function(x, y) {
    if (x && y) {
      var xStr = x.map(function(value) { return value.name; }).join(':');
      var yStr = y.map(function(value) { return value.name; }).join(':');
      return xStr.localeCompare(yStr);
    }
  });

  return result;
};
