var cip = require('cip-js');
var cache = require('memory-cache');
var Q = require('q');
var Iconv  = require('iconv').Iconv; // Used to parse a UTF16-LE to UTF16-BE string.

if(process.env.CIP_USERNAME === undefined || process.env.CIP_PASSWORD === undefined) {
    console.log("Please set CIP_USERNAME and CIP_PASSWORD, exiting!");
    process.exit(1);
}

var CIP_USERNAME = process.env.CIP_USERNAME;
var CIP_PASSWORD = process.env.CIP_PASSWORD;

// Cache in 30 s.
var CACHE_TIME = 1000 * 30;

var NatMusConfig = {
    endpoint: "http://cumulus.natmus.dk/CIP/",
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
        "Etnografisk Samling": "ES",
        "Danmarks Oldtid": "DO",
        "Frilandsmuseet": "FLM"
    }
};

exports.init_session = function init_session(force_init) {
    var nm = cache.get('nm');

    var deferred = Q.defer();

    if(nm && !force_init) {
        deferred.resolve(nm);
    }
    else {
        nm = new cip.CIPClient(NatMusConfig);
	    nm.session_open(
            CIP_USERNAME, CIP_PASSWORD,
            function( ) {
                console.log('CIP session initialized successfully:', nm.jsessionid);
                cache.put('nm', nm, CACHE_TIME);
                deferred.resolve(nm);
            },
            function( ) {
                deferred.reject( new Error("Couldn't open session, check connection, username and password.") );
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
            if(catalogs === null) {
                deferred.reject();
            } else {
                cache.put('catalogs', catalogs, CACHE_TIME);
                deferred.resolve(catalogs);
            }
        });
    }

    return deferred.promise;
};

exports.get_recent_assets = function get_recent_assets(nm, catalog, from_date, extra_fields) {
    var deferred = Q.defer();

    var search_string = '"Record Modification Date" >= ' + from_date;
    nm.criteriasearch(
        {catalog: catalog},
        search_string,
        null,
        deferred.resolve,
        deferred.reject
    );
    
    return deferred.promise;
};

exports.get_asset = function get_asset(nm, catalog, id) {
    var deferred = Q.defer();

    var id_string = 'ID is "' + id + '"';
    var cache_key = 'asset_' + catalog + '_' + id;
    var asset = cache.get(cache_key);

    if(!asset) {
        nm.criteriasearch({catalog: {alias: catalog}}, id_string, null, function(result) {
            if(result === null) {
                deferred.reject( new Error("The CIP returned no result.") );
            } else {
                result.get(1, 0, function(returnvalue) {
                    if(returnvalue !== null) {
                        cache.put(cache_key, returnvalue, CACHE_TIME);
                        deferred.resolve(returnvalue);
                    } else {
                        deferred.reject( new Error("The CIP returned an empty result.") );
                    }
                });
            }
        }, function(err) {
            deferred.reject( new Error("Error performing criteria search: " + err) );
        });
    } else {
        deferred.resolve(asset);
    }

    return deferred.promise;
};

exports.find_catalog = function find_catalog(catalogs, alias) {
    for(var i=0; i < catalogs.length; ++i) {
        if(catalogs[i].alias === alias) {
            return catalogs[i];
        }
    }

    return null;
};

exports.get_related_assets = function get_related_assets(asset, relation) {
    // TODO: Assert that asset is a CIPAsset object.
    var deferred = Q.defer();
    if(asset && relation) {
        asset.get_related_assets(relation, deferred.resolve);
    } else {
        deferred.reject( new Error("The asset or relation was not provided.") );
    }
    return deferred.promise;
}

var depth = 0;

function depth_tabs() {
    var result = '';
    for(var d = 0; d < depth; d++) {
        result += '\t';
    }
    return result;
}

var utf16_be2le = new Iconv('UTF-16BE', 'UTF-16LE');

function parse_binary_value( buf, type ) {
    if(type === 'UChr') {
        return utf16_be2le.convert(buf).toString('utf16le');
    } else if(type === 'list') {
        return parse_binary_list(buf);
    } else if(type === 'gUid') {
        if(buf.length !== 16) {
            throw new Error('Expected a gUid buffer to be of length 16.');
        }
        var parts = [
            buf.slice(0, 4).toString('hex'),
            buf.slice(4, 6).toString('hex'),
            buf.slice(6, 8).toString('hex'),
            buf.slice(8, 10).toString('hex'),
            buf.slice(10, 16).toString('hex')
        ];
        return parts.join('-');
    } else if(type === 'Long') {
        if(buf.length !== 4) {
            throw new Error('Expected a Long buffer to be of length 4.');
        }
        return buf.readUInt32BE(0);
    } else {
        throw new Error( 'binary_value: Unimplemented type ' + type );
    }
}

function parse_binary_element( buf, type ) {
    var field_count = buf.readUInt32BE(0);
    // console.log(depth_tabs(), 'Parsing binary element type', type, 'size',
    //     buf.length, 'with', field_count, 'fields.');

    var result = { type: type };

    var offset = 4;
    // depth++;
    for(var f = 0; f < field_count; f++) {
        // console.log(depth_tabs(), 'Parsing binary field indexed', f);
        // console.log(depth_tabs(), buf.slice(offset), buf.slice(offset).toString());
        var field_size = buf.readUInt32BE(offset);
        // console.log(depth_tabs(), 'Field size:', field_size);
        var field_name = buf.slice(offset+4, offset+8).toString('utf8');
        // console.log(depth_tabs(), 'Field name:', field_name);
        var field_type = buf.slice(offset+8, offset+12).toString('utf8');
        // console.log(depth_tabs(), 'Field type:', field_type);
        var field_buffer = buf.slice(offset+12, offset+field_size+12);
        var field_value = parse_binary_value(field_buffer, field_type);
        // The CIP has a bug where a null-terminated string's size
        // does not include the two null bytes in the field size.
        // If we read the 4 bytes just after the field value's buffer and
        // they are all zero's, this is probably not the length of the next
        // field's value, thus this the two first are assumed to be null bytes
        // from the string.
        // To make sure we don't read outside the stream, we check the bounds.
        if(f < field_count-1) {
            var checked = buf.readUInt32BE(offset+field_size+12);
            if(field_type === 'UChr' && checked === 0 && f !== field_count-1) {
                field_size+=2;
            }
        }
        // console.log(depth_tabs(), 'Field value:', field_value);
        result[field_name] = field_value;

        offset += field_size+12;
    }
    // depth--;

    return result;
}

function parse_binary_list( buf ) {
    var list_length = buf.readUInt32BE(0);
    // console.log( depth_tabs(), 'Parsing a list of length', list_length );
    var result = [];

    var offset = 4;
    // depth++;
    for(var i = 0; i < list_length; i++) {
        // console.log( depth_tabs(), 'Parsing a list element indexed', i );
        var element_size = buf.readUInt32BE(offset);
        // console.log( depth_tabs(), 'List element indexed', i, 'has size', element_size );
        var element_type = buf.slice(offset+4, offset+8).toString('utf8');
        // console.log( depth_tabs(), 'List element indexed', i, 'has type', element_type );
        var element_buffer = buf.slice(offset+8, offset+element_size+8);
        var element = parse_binary_element(element_buffer, element_type);
        result.push( element );
        offset += element_size+8;
    }
    // depth--;

    return result;
}

// Parse binary field value (64 encoded string) to object.
exports.binary_to_object = function binary_to_object(binary_base64_encoded) {
    if(binary_base64_encoded) {
        var buf = new Buffer( binary_base64_encoded, 'base64' );
        // We expect that we start with a list.
        var type = buf.slice(0, 4).toString('utf8');
        var element_buffer = buf.slice(4);
        return parse_binary_value( element_buffer, type );
    } else {
        return null;
    }
}

exports.parse_binary_relations = function(binary_base64_encoded) {
    var result = [];
    var related_assets = exports.binary_to_object(binary_base64_encoded);
    if(related_assets) {
        // Perform a transformation.
        for(var r in related_assets) {
            var related_asset = related_assets[r];
            if(related_asset.type !== 'reco') {
                continue;
            }

            for(ref in related_asset.Refs) {
                var reference = related_asset.Refs[ref];
                if(reference.type !== 'reco') {
                    continue;
                }

                result.push({
                    id: reference.RcID,
                    filename: related_asset.Name,
                    relation: reference.RlID
                });
            }
        }
    }
    return result;
}