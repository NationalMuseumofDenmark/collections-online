'use strict';

var natmus = require('natmus-js');
var Q = require('q');
// Used to parse a UTF16-LE to UTF16-BE string.
var Iconv  = require('iconv').Iconv;
var config = require('../config/config');

var nm = new natmus.NatmusClient();
var originalRequest = nm.request.bind(nm);

nm.initSession = function(forceInit) {
  if (!this.isConnected() || forceInit) {
    if (!config.cipUsername || !config.cipPassword) {
      throw new Error('Please set CIP username and password!');
    }
    return this.sessionOpen(config.cipUsername, config.cipPassword).then(() => {
      return this;
    }, (err) => {
      if (!err) {
        throw new Error('Could not open CIP session: ' +
                        'Check connection, username and password.');
      } else {
        throw err;
      }
    });
  } else {
    return new Q(this);
  }
};

nm.request = function(operation, namedParameters, data) {
  var performRequest = () => {
    // Try to do the operation
    return originalRequest(operation, namedParameters, data)
    .then(undefined, (err) => {
      console.error('Error communicating with CIP (retrying): ' + err.message);
      // Let's reinitialize the session and try again.
      return this.initSession(true).then(() => {
        return originalRequest(operation, namedParameters, data);
      });
    });
  };

  var operationString = typeof(operation) === 'string' ?
                        operation :
                        operation.join('/');

  if (!this.isConnected() && operationString !== 'session/open') {
    // Open a session and then perform the request.
    return this.initSession().then(performRequest);
  } else {
    return performRequest();
  }
};

nm.getRecentAssets = function(nm, catalog, fromDate) {
  var searchString = '"Record Modification Date" >= ' + fromDate;
  return nm.criteriaSearch({
    catalog: catalog
  }, searchString, null);
};

nm.setFieldValues = function(nm, catalogAlias, id, view, values) {
  var operation = [
    'metadata',
    'setfieldvalues',
    catalogAlias,
    view
  ].join('/');

  values.id = parseInt(id);
  return nm.request(operation, {}, {
    items: [values]
  });
};

nm.findCatalog = function(catalogs, alias) {
  for (var i = 0; i < catalogs.length; ++i) {
    if (catalogs[i].alias === alias) {
      return catalogs[i];
    }
  }
  return null;
};

nm.getRelatedAssets = function(asset, relation) {
  if (asset && relation) {
    return asset.getRelatedAssets(relation);
  } else {
    throw new Error('The asset or relation was not provided.');
  }
};

/*
var depth = 0;

function depthTabs() {
    var result = '';
    for (var d = 0; d < depth; d++) {
        result += '\t';
    }
    return result;
}
*/

var utf16BE2LE = new Iconv('UTF-16BE', 'UTF-16LE');

// We need to use this jshint option, because the three functions reference
// each other circularly value -> list -> element -> value -> ...
/* jshint latedef:nofunc */

function parseBinaryValue(buf, type) {
  if (type === 'UChr') {
    return utf16BE2LE.convert(buf).toString('utf16le');
  } else if (type === 'list') {
    return parseBinaryList(buf);
  } else if (type === 'gUid') {
    if (buf.length !== 16) {
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
  } else if (type === 'Long') {
    if (buf.length !== 4) {
      throw new Error('Expected a Long buffer to be of length 4.');
    }
    return buf.readUInt32BE(0);
  } else {
    throw new Error('binary_value: Unimplemented type ' + type);
  }
}

function parseBinaryElement(buf, type) {
  var fieldCount = buf.readUInt32BE(0);
  // console.log(depth_tabs(), 'Parsing binary element type', type, 'size',
  //     buf.length, 'with', fieldCount, 'fields.');

  var result = {
    'type': type
  };

  var offset = 4;
  // depth++;
  for (var f = 0; f < fieldCount; f++) {
    // console.log(depth_tabs(), 'Parsing binary field indexed', f);
    // console.log(depth_tabs(), buf.slice(offset), buf.slice(offset).toString());
    var fieldSize = buf.readUInt32BE(offset);
    // console.log(depth_tabs(), 'Field size:', fieldSize);
    var fieldName = buf.slice(offset + 4, offset + 8).toString('utf8');
    // console.log(depth_tabs(), 'Field name:', fieldName);
    var fieldType = buf.slice(offset + 8, offset + 12).toString('utf8');
    // console.log(depth_tabs(), 'Field type:', fieldType);
    var fieldBuffer = buf.slice(offset + 12, offset + fieldSize + 12);
    var fieldValue = parseBinaryValue(fieldBuffer, fieldType);
    // The CIP has a bug where a null-terminated string's size
    // does not include the two null bytes in the field size.
    // If we read the 4 bytes just after the field value's buffer and
    // they are all zero's, this is probably not the length of the next
    // field's value, thus this the two first are assumed to be null bytes
    // from the string.
    // To make sure we don't read outside the stream, we check the bounds.
    if (f < fieldCount - 1) {
      var checked = buf.readUInt32BE(offset + fieldSize + 12);
      if (fieldType === 'UChr' && checked === 0 && f !== fieldCount - 1) {
        fieldSize += 2;
      }
    }
    // console.log(depth_tabs(), 'Field value:', fieldValue);
    result[fieldName] = fieldValue;

    offset += fieldSize + 12;
  }
  // depth--;

  return result;
}

function parseBinaryList(buf) {
  var listLength = buf.readUInt32BE(0);
  // console.log( depth_tabs(), 'Parsing a list of length', listLength );
  var result = [];

  var offset = 4;
  // depth++;
  for (var i = 0; i < listLength; i++) {
    // console.log( depth_tabs(), 'Parsing a list element indexed', i );
    var elementSize = buf.readUInt32BE(offset);
    // console.log( depth_tabs(), 'List element indexed', i, 'has size', elementSize );
    var elementType = buf.slice(offset + 4, offset + 8).toString('utf8');
    // console.log( depth_tabs(), 'List element indexed', i, 'has type', elementType );
    var elementBuffer = buf.slice(offset + 8, offset + elementSize + 8);
    var element = parseBinaryElement(elementBuffer, elementType);
    result.push(element);
    offset += elementSize + 8;
  }
  // depth--;

  return result;
}

// Parse binary field value (64 encoded string) to object.
nm.binaryToObject = function(binaryBase64Encoded) {
  if (binaryBase64Encoded) {
    var buf = new Buffer(binaryBase64Encoded, 'base64');
    // We expect that we start with a list.
    var type = buf.slice(0, 4).toString('utf8');
    var elementBuffer = buf.slice(4);
    return parseBinaryValue(elementBuffer, type);
  } else {
    return null;
  }
};

nm.parseBinaryRelations = function(binaryBase64Encoded) {
  var result = [];
  var relatedAssets = this.binaryToObject(binaryBase64Encoded);
  if (relatedAssets) {
    // Perform a transformation.
    for (var r in relatedAssets) {
      var relatedAsset = relatedAssets[r];
      if (relatedAsset.type !== 'reco') {
        continue;
      }

      for (var ref in relatedAsset.Refs) {
        var reference = relatedAsset.Refs[ref];
        if (reference.type !== 'reco') {
          continue;
        }

        result.push({
          id: reference.RcID,
          filename: relatedAsset.Name,
          relation: reference.RlID
        });
      }
    }
  }
  return result;
};

module.exports = nm;
