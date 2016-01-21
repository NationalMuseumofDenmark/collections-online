var natmus = require('natmus-js'),
    cache = require('memory-cache'),
    Q = require('q'),
    Iconv  = require('iconv').Iconv, // Used to parse a UTF16-LE to UTF16-BE string.
    request = require('request');

// Cache in 30 s.
var CACHE_TIME = 1000 * 30;

exports.initSession = function(forceInit) {
  var nm = cache.get('nm');

  if(nm && !forceInit) {
    return new Q(nm);
  } else {
    if(process.env.CIP_USERNAME === undefined || process.env.CIP_PASSWORD === undefined) {
      throw new Error("Please set CIP_USERNAME and CIP_PASSWORD!");
    }

    nm = new natmus.NatmusClient();
    return nm.sessionOpen(process.env.CIP_USERNAME, process.env.CIP_PASSWORD)
    .then(function() {
      console.log('CIP session initialized successfully:', nm.jsessionid);
      cache.put('nm', nm, CACHE_TIME);
      return nm;
    }, function() {
      throw new Error("Couldn't open session, check connection, username and password.");
    });
  }
};

exports.getCatalogs = function(nm) {
    var catalogs = cache.get('catalogs');
    if(catalogs) {
      return new Q(catalogs);
    } else {
	    return nm.getCatalogs().then(function(catalogs) {
        if(catalogs) {
          cache.put('catalogs', catalogs, CACHE_TIME);
          return catalogs;
        }
      });
    }
};

exports.getRecentAssets = function(nm, catalog, fromDate) {
    var searchString = '"Record Modification Date" >= ' + fromDate;
    return nm.criteriaSearch({
      catalog: catalog
    }, searchString, null);
};

exports.getAsset = function(nm, catalog, id) {
    var id_string = 'ID is "' + id + '"';
    var cache_key = 'asset_' + catalog + '_' + id;
    var asset = cache.get(cache_key);

    if(asset) {
      return new Q(asset);
    } else {
      // Search for the id, no searchterm or sorting. The final boolean argument
      // tells the search to return a single asset, without creating an
      // intermediary result object.
      return nm.advancedSearch({
        catalog: {alias: catalog}
      }, id_string, undefined, null)
      .then(function(result) {
        if(result) {
          cache.put(cache_key, result, CACHE_TIME);
          return result;
        }
      });
    }
};

exports.setFieldValues = function(nm, catalogAlias, id, view, values) {
  var operation = [
    'metadata',
    'setfieldvalues',
    catalogAlias,
    view
  ].join('/');

  values.id = id;
  return nm.request(operation, {
    field: [values]
  });
};

exports.findCatalog = function(catalogs, alias) {
    for(var i=0; i < catalogs.length; ++i) {
        if(catalogs[i].alias === alias) {
            return catalogs[i];
        }
    }
    return null;
};

exports.getRelatedAssets = function(asset, relation) {
    if(asset && relation) {
      return asset.getRelatedAssets(relation);
    } else {
      throw new Error("The asset or relation was not provided.");
    }
};

/*
var depth = 0;

function depthTabs() {
    var result = '';
    for(var d = 0; d < depth; d++) {
        result += '\t';
    }
    return result;
}
*/

var utf16_be2le = new Iconv('UTF-16BE', 'UTF-16LE');

// We need to use this jshint option, because the three functions reference
// each other circularly value -> list -> element -> value -> ...
/* jshint latedef:nofunc */

function parseBinaryValue( buf, type ) {
    if(type === 'UChr') {
        return utf16_be2le.convert(buf).toString('utf16le');
    } else if(type === 'list') {
        return parseBinaryList(buf);
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

function parseBinaryElement( buf, type ) {
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
        var field_value = parseBinaryValue(field_buffer, field_type);
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

function parseBinaryList( buf ) {
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
        var element = parseBinaryElement(element_buffer, element_type);
        result.push( element );
        offset += element_size+8;
    }
    // depth--;

    return result;
}

// Parse binary field value (64 encoded string) to object.
exports.binaryToObject = function(binary_base64_encoded) {
    if(binary_base64_encoded) {
        var buf = new Buffer( binary_base64_encoded, 'base64' );
        // We expect that we start with a list.
        var type = buf.slice(0, 4).toString('utf8');
        var element_buffer = buf.slice(4);
        return parseBinaryValue( element_buffer, type );
    } else {
        return null;
    }
};

exports.parseBinaryRelations = function(binary_base64_encoded) {
    var result = [];
    var related_assets = exports.binaryToObject(binary_base64_encoded);
    if(related_assets) {
        // Perform a transformation.
        for(var r in related_assets) {
            var related_asset = related_assets[r];
            if(related_asset.type !== 'reco') {
                continue;
            }

            for(var ref in related_asset.Refs) {
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
};
