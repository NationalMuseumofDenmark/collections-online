'use strict';

var cip = require('../cip-methods.js');

var result_mapping = [
    {'key': '{af4b2e00-5f6a-11d2-8f20-0000c0e166dc}',
     'short': 'filename'
    },
    {'key': '{f5d1dcd8-c553-4346-8d4d-672c85bb59be}',
     'short': 'license',
    },
    {'key': '{9b071045-118c-4f42-afa1-c3121783ac66}',
     'short': 'creator',
    },
    {'key': '{af4b2e2c-5f6a-11d2-8f20-0000c0e166dc}',
     'short': 'copyright',
    },
    {'key': '{2ce9c8eb-b83d-4a91-9d09-2141cac7de12}',
     'short': 'description',
    },
    {'key': '{af4b2e0f-5f6a-11d2-8f20-0000c0e166dc}',
     'short': 'dpi',
    },
    {'key': '{418a4c92-fe63-11d3-9030-0080ad80c556}',
     'short': 'longitude',
    },
    {'key': '{418a4c91-fe63-11d3-9030-0080ad80c556}',
     'short': 'latitude',
    },
    {'key': '{ca6903b8-c3c4-47fa-9592-2d486d766ce0}',
     'short': 'actorname',
    },
    {'key': '{38664623-b081-4251-8c1c-383ef57ac54d}',
     'short': 'locationnote'
    },
    {'key': '{a02dd229-5aa8-4bb4-825a-038cf21f92bd}',
     'short': 'year'
    }
];

function format_result(fields) {
    var result = {};
    console.log(fields);
    for(i=0; i < result_mapping.length; ++i) {
        if(result_mapping[i].key in fields) {
            result[result_mapping[i].short] = fields[result_mapping[i].key];
        }
    }
    console.log(result)
    return result;
}

exports.index = function(req, res) {
    var catalog = req.params.catalog;
    var id = req.params.id;

    cip.init_session(function(nm) {
        cip.get_catalogs(nm, function(catalogs) {
            cip.get_asset(nm, catalogs, catalog, id, function(items) {
                if(items.length == 0) {
                    res.write('Element could not be found');
                    res.end();
                    return;
                }

                res.render('asset',
                           {'item': format_result(items[0].fields),
                            'image': items[0].get_preview_url()});
            });
        });
    });
};
