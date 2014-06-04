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
    var nm = cache.get('nm');

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
        );
    }
};

exports.get_catalogs = function get_catalogs(nm, callback) {
    var catalogs = cache.get('catalogs');

    if(catalogs) {
        callback(catalogs);
    }
    else {
	    nm.get_catalogs(function(catalogs) {
            cache.put('catalogs', catalogs, CACHE_TIME);
            callback(catalogs);
        });
    }
};

exports.get_recent_assets = function get_recent_assets(nm, catalog, expr, callback) {
    function search_callback(result) {
        result.get(1000, 0, function(returnvalue) {
            callback(result.catalog, returnvalue);
        });
    }

    var search_string = '"Record Modification Date" >= ' + expr;
    nm.criteriasearch({catalog: catalog}, search_string, search_callback);
};

exports.get_asset = function get_asset(nm, catalog, id, callback) {
    var id_string = 'ID is "' + id + '"';

    var asset = cache.get('asset_' + catalog + '_' + id);

    if(!asset) {
        nm.criteriasearch({catalog: {alias: catalog}}, id_string, function(result) {
            result.get(1, 0, function(returnvalue) {
                cache.put('asset_' + catalog + '_' + id,
                          returnvalue, CACHE_TIME);
                callback(returnvalue);
            });
        });

    }
    else {
        callback(asset);
    }
};



