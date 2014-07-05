var cip = require('cip.js');
var cache = require('memory-cache');
var Q = require('q');

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
        "Musikmuseet": "MUM",
        "Etnografisk Samling": "ES"
    }
};

exports.init_session = function init_session() {
    var nm = cache.get('nm');

    var deferred = Q.defer();

    if(nm) {
        deferred.resolve(nm);
    }
    else {
        nm = new cip.CIPClient(NatMusConfig);
	    nm.session_open(
            CIP_USERNAME, CIP_PASSWORD,
            function() {
                cache.put('nm', nm, CACHE_TIME);
                deferred.resolve(nm);
            }
        );
    }

    return deferred.promise;
};

exports.get_catalogs = function get_catalogs(nm) {
    var catalogs = cache.get('catalogs');

    var deferred = Q.defer();

    if(catalogs) {
        deferred.resolve(catalogs);
    }
    else {
	    nm.get_catalogs(function(catalogs) {
            cache.put('catalogs', catalogs, CACHE_TIME);
            deferred.resolve(catalogs);
        });
    }

    return deferred.promise;
};

exports.get_recent_assets = function get_recent_assets(nm, catalog, expr, callback) {
    var search_string = '"Record Modification Date" >= ' + expr;
    nm.criteriasearch({catalog: catalog}, search_string, callback);
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

exports.find_catalog = function find_catalog(catalogs, alias) {
    for(var i=0; i < catalogs.length; ++i) {
        if(catalogs[i].alias == alias) {
            return catalogs[i];
        }
    }

    return null;
}

// Grab the nested categories for breadcrumbs
/**
 * [nested_categories description]
 * @param  {object} obj The nested object to iterate through
 * @param  {integer} val The id of the category to find
 * @return {object}     Returns an object containing the sub elements [first] and [second] categories
 */
exports.nested_categories = function(obj, val) {
  var nested = [];

  for (var i in obj) {
    if (obj[i].id == val) {
    nested['first'] = obj[i];

    return nested;
  }

    for (var sub in obj[i].children) {
      if (obj[i].children[sub].id == val) {
        nested['first'] = obj[i];
        nested['second'] = obj[i].children[sub];

        return nested;
      }
    }
  }

  return nested.length > 0 ? nested : null;
}
