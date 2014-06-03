var cip = require('./cip-methods.js');
var Q = require('q');

function Categories(tree, callback) {
    this.get_parent = function get_parent(x) {
        function traverse(tree, path) {
            if(tree.id === x) {
                return path;
            }

            path.push(tree);

            for(var i=0; i < tree.subcategories.length; ++i) {
                var result = traverse(tree.subcategories[i], path);

                if(result) {
                    return result;
                }
            }

            return null;
        }

        traverse(this.tree, []);
    };

    this.get_node = function get_node(x) {
        function traverse(tree) {
            if(tree.id === x) {
                return tree;
            }

            for(var i=0; i < tree.subcategories.length; ++i) {
                var result = traverse(tree.subcategories[i]);

                if(result) {
                    return result;
                }
            }

            return null;
        }

        traverse(this.tree);
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

exports.load_categories = function load_categories(callback) {
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

    cip.init_session(function(nm) {
        cip.get_catalogs(nm, function(catalogs) {
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

                callback(final_result);

            }, function() {});
        });
    });
};
