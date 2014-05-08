var cip = require('cip.js');
var cache = require('memory-cache');

var CIP_USERNAME = "cip-bitblueprint-readonly";
var CIP_PASSWORD = "JzxlDyo7KHgC";

var CACHE_TIME = 1000 * 60 * 5;

var NatMusConfig = {
    endpoint: "http://samlinger.natmus.dk/CIP/",
    constants: {
        catch_all_alias: "any",
        layout_alias: "web"
    },
    catalog_aliases: {
        "Alle": "ALL",
        "Antiksamlingen": "AS",
        "Bevaringsafdelingen": "BA",
        "Danmarks Middelalder og Renæssance": "DMR",
        "Danmarks Nyere Tid": "DNT",
        "Etnografisk samling": "ES",
        "Frihedsmuseet": "FHM",
        "Den Kgl. Mønt- og Medaljesamling": "KMM",
        "Musikmuseet": "MUM"
    }
};

exports.init_session = function init_session(callback) {
    nm = cache.get('nm');

    if(nm) {
        callback(nm);
    }
    else {
        nm = new cip.CIPClient(NatMusConfig);
	    nm.session_open(
            CIP_USERNAME, CIP_PASSWORD,
            function() {
                cache.put('nm', nm, CACHE_TIME);
                callback(nm);
            }
        )
    }
}

exports.get_catalogs = function get_catalogs(nm, callback) {
    catalogs = cache.get('catalogs');
    if(catalogs) {
        callback(catalogs);
    }
    else {
	    nm.get_catalogs(function(catalogs) {
            cache.put('catalogs', catalogs, CACHE_TIME);
            callback(catalogs);
        });
    }
}

exports.get_asset = function get_asset(nm, catalogs, catalog, id, callback) {
    var catalog_string = catalog;
    var id_string = 'ID is "' + id + '"';

    asset = cache.get('asset_' + catalog + '_' + id);

    if(!asset) {
        for(i=0; i < catalogs.length; ++i) {
            if(catalogs[i].alias == catalog_string) {
                catalogs[i].get_tables(function(tables) {
                    tables[0].get_layout(function(response) { console.log(response) });
                    tables[0].criteriasearch(id_string, function(result) {
                        result.get(10, 0, function(returnvalue) {
                            cache.put('asset_' + catalog + '_' + id, returnvalue, CACHE_TIME);
                            callback(returnvalue);
                        });
                    });
                });
                break;
            }
        }
    }
    else {
        callback(asset);
    }
}
