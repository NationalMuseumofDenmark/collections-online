var cip = require('./cip-methods.js');
var Q = require('q');

function Categories(tree, callback) {
    this.get_path = function get_path(x) {
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

    this.get_node = function get_node(x) {
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

    this.dump_tree = function dump_tree(tree) {
        console.log(tree.id + ':' + tree.name);
        for(var i=0; i < tree.children.length; ++i) {
            this.dump_tree(tree.children[i]);
        }
    };

    this.build_tree = function build_tree(tree) {

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
            result.children.push(subcategories);
        }

        return result;
    };

    this.tree = {};
    this.tree = this.build_tree(tree);

    callback(this);
}

exports.load_categories = function load_categories() {
    function get_categories_for_catalog(catalog) {
        var deferred = Q.defer();

        catalog.get_categories(1, 'all', function(response) {
            if(!response) {
                deferred.reject();
                return;
            }
            var categories = new Categories(response, function(categories) {
                categories.id = catalog.alias;
                deferred.resolve(categories);
            });
        });

        return deferred.promise;
    }

    var deferred = Q.defer();

    cip.init_session().then(function(nm) {
        cip.get_catalogs(nm).then(function(catalogs) {
            var promises = [];

            for(var i=0; i < catalogs.length; ++i) {
                promises.push(get_categories_for_catalog(catalogs[i]));
            }

            Q.allSettled(promises).then(function(result) {
                var final_result = [];

                for(var i=0; i < result.length; ++i) {
                    if(result[i].state === 'fulfilled') {
                        final_result.push(result[i].value);
                    }
                }

                deferred.resolve(final_result);

            }, deferred.reject);
        }, deferred.reject);
    }, deferred.reject);

    return deferred.promise;
};

exports.format_categories = function format_categories(category_storage, categories) {
    var result = [];

    for(var i=0; i < categories.length; i++) {
        if(categories[i].path.indexOf('$Categories') === 0 && categories[i].id !== 1) {
           result.push(category_storage.get_path(categories[i].id));
        }
    }

    result.sort(function(x, y) {
        var x_str = x.map(function(value) { return value.name; }).join(':');
        var y_str = y.map(function(value) { return value.name; }).join(':');
        return x_str < y_str ? -1 : (x_str > y_str ? 1 : 0);
    });

    return result;
};
