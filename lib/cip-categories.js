cip = require('./cip-methods.js');

exports.Categories = function Categories(tree, callback) {
    this.get_parent = function get_parent(x) {
        function traverse(tree, path) {
            if(tree.id == x) {
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
            if(tree.id == x) {
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

    this.build_tree = function build_tree(tree) {

        var result = {
            id: tree['id'],
            name: tree['Category Name'],
            children: []
        };

        if(!tree.hassubcategories) {
            return result;
        }

        for(var i=0; i < tree.subcategories.length; ++i) {
            result.children.push(this.build_tree(tree.subcategories[i]));
        }

        return result;
    };

    this.tree = {};
    this.tree = this.build_tree(tree);

    callback(this.tree);
}
