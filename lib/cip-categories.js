var cip = require('./services/natmus-cip');
var Q = require('q');
var config = require('./config/config');

function Categories(tree) {
    this.get_path = function(x) {
        function traverse(tree, path) {
            path.push(tree);

            if(tree.id === x) {
                return path;
            }

            for(var i=0; i < tree.children.length; ++i) {
                var result = traverse(tree.children[i], path.slice(0));

                if(result !== null) {
                    return result;
                }
            }

            return null;
        }

        return traverse(this.tree, []);
    };

    this.get_node = function(x) {
        function traverse(tree) {
            if(tree.id === x) {
                return tree;
            }

            for(var i=0; i < tree.children.length; ++i) {
                var result = traverse(tree.children[i]);

                if(result !== null) {
                    return result;
                }
            }

            return null;
        }

        return traverse(this.tree);
    };

    this.dump_tree = function(tree) {
        console.log(tree.id + ':' + tree.name);
        for(var i=0; i < tree.children.length; ++i) {
            this.dump_tree(tree.children[i]);
        }
    };

    this.build_tree = function(tree) {

        // If the category id is in the blacklist, just return null.
        if(config.categoryBlacklist.indexOf(tree.id) !== -1) {
            return null;
        }
        // Check that the category actually has assets in it.


        var result = {
            id: tree.id,
            name: tree['Category Name'],
            children: []
        };

        if(!tree.hassubcategories) {
            return result;
        }

        for(var i=0; i < tree.subcategories.length; ++i) {
            var subcategories = this.build_tree(tree.subcategories[i]);
            if(subcategories !== null) {
                result.children.push(subcategories);
            }
        }

        return result;
    };

    this.tree = {};
    this.tree = this.build_tree(tree);
}

exports.load_categories = function load_categories() {
    function get_categories_for_catalog(catalog) {
        return catalog.getCategories(1, 'all')
        .then(function(response) {
            if(!response || !response.body) {
                return;
            }
            var categories = new Categories(response.body);
            categories.id = catalog.alias;
            return categories;
        });
    }

    return cip.initSession().then(function(nm) {
        return cip.getCatalogs(nm).then(function(catalogs) {
            var promises = [];

            for(var i=0; i < catalogs.length; ++i) {
                var catalog = catalogs[i];
                promises.push( get_categories_for_catalog(catalog) );
            }

            console.log('Fetching categories for', promises.length, 'catalogs.');

            return Q.allSettled(promises).then(function(result) {
                var final_result = [];

                for(var i=0; i < result.length; ++i) {
                    if(result[i].state === 'fulfilled') {
                        final_result.push(result[i].value);
                    }
                }

                console.log('Got categories for', final_result.length, 'catalogs.');

                return final_result;

            });
        });
    });
};

exports.fetch_category_counts = function fetch_category_counts(esClient, catalogs) {

    function handleCategoryNode(categoryCounts, node) {
        var categoryCount = categoryCounts[node.id];
        if(categoryCount > 0) {
            node.count = categoryCount;
        } else {
            node.count = 0;
        }
        // Progress recursively ..
        for(var c in node.children) {
            handleCategoryNode( categoryCounts, node.children[c] );
        }
    }

    function handleEsAggregations(response) {
        var categoryCounts = {};
        var categoryAggregations = response.aggregations.catalog.categories.buckets;
        for(var f in categoryAggregations) {
            var categoryId = categoryAggregations[f].key;
            var categoryCount = categoryAggregations[f].doc_count;
            categoryCounts[categoryId] = categoryCount;
        }
        handleCategoryNode(categoryCounts, this.tree);
    }

    var promises = [];
    for(var c in catalogs) {
        var catalog = catalogs[c];
        var catalogAlias = catalog.id;

        var countPromise = esClient.search({
            index: config.es_assets_index,
            body: {
                "size": 0,
                "aggs": {
                    "catalog": {

                        "filter": { "and": [
                                {"query" : { "match" : { "catalog" : catalogAlias } }},
                                {"query" : { "match" : { "is_searchable" : true } }}
                        ] },
                        "aggs":{
                          "categories": {
                            "terms" : {
                                "field" : "categories_int",
                                "size" : 1000000000 // A very large number
                            },
                          }
                        }
                    }
                }
            }
        }).then( handleEsAggregations.bind(catalog) );

        promises.push(countPromise);
    }

    // When all the facet searches for assets are ready.
    return Q.all(promises).then(function() {
        // Return the new catalogs with counts.
        return catalogs;
    });
};

exports.format_categories = function format_categories(category_storage, categories) {
    var result = [];

    for(var c in categories) {
        var category = categories[c];
        if(category.path.indexOf('$Categories') === 0 && category.id !== 1) {
           result.push(category_storage.get_path(category.id));
        }
    }

    // Sort by lexicographical order of the concatinated names.
    result.sort(function(x, y) {
        if(x && y) {
            var x_str = x.map(function(value) { return value.name; }).join(':');
            var y_str = y.map(function(value) { return value.name; }).join(':');
            return x_str.localeCompare(y_str);
        }
    });

    return result;
};
