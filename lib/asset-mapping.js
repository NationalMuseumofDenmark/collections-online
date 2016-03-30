'use strict';

var cip = require('./services/natmus-cip');

var fieldMapping = [{
  'key': 'id',
  'short': 'id'
}, {
  'key': '{af4b2e00-5f6a-11d2-8f20-0000c0e166dc}',
  'short': 'filename'
}, {
  'key': '{f5d1dcd8-c553-4346-8d4d-672c85bb59be}',
  'short': 'license',
}, {
  'key': '{9b071045-118c-4f42-afa1-c3121783ac66}',
  'short': 'creator',
}, {
  'key': '{af4b2e2c-5f6a-11d2-8f20-0000c0e166dc}',
  'short': 'copyright',
}, {
  'key': '{2ce9c8eb-b83d-4a91-9d09-2141cac7de12}',
  'short': 'description',
}, {
  'key': '{af4b2e12-5f6a-11d2-8f20-0000c0e166dc}',
  'short': 'height_in'
}, {
  'key': '{af4b2e11-5f6a-11d2-8f20-0000c0e166dc}',
  'short': 'width_in'
}, {
  'key': '{af4b2e0f-5f6a-11d2-8f20-0000c0e166dc}',
  'short': 'dpi',
}, {
  'key': '{f7bb28d1-0ef1-46b5-90c8-202f90800eff}',
  'short': 'google_maps_coordinates',
}, {
  'key': '{81780c19-86be-44e6-9eeb-4e63f16d7215}',
  'short': 'google_maps_coordinates_crowd',
}, {
  'key': '{418a4c92-fe63-11d3-9030-0080ad80c556}',
  'short': 'longitude',
}, {
  'key': '{418a4c91-fe63-11d3-9030-0080ad80c556}',
  'short': 'latitude',
}, {
  'key': '{ef236a08-62f8-485f-b232-9771792d29ba}',
  'short': 'heading',
}, {
  'key': '{6864395c-c433-2148-8b05-56edf606d4d4}',
  'short': 'tags_vision'
}, {
  'key': '{73be3a90-a8ef-4a42-aa8f-d16ca4f55e0a}',
  'short': 'tags_crowd'
}, {
  'key': '{ca6903b8-c3c4-47fa-9592-2d486d766ce0}',
  'short': 'actorname',
}, {
  'key': '{38664623-b081-4251-8c1c-383ef57ac54d}',
  'short': 'locationnote'
}, {
  'key': '{a02dd229-5aa8-4bb4-825a-038cf21f92bd}',
  'short': 'year'
}, {
  'key': '{76f2cca6-3652-40ee-b198-5d0afe931caa}',
  'short': 'inventory_number' // Inventar nr.
    //'short': 'assetno'
}, {
  'key': '{59ac5106-a3b4-4152-8647-66cebcb6af48}',
  'short': 'creation_time_from'
}, {
  'key': '{eaf2f030-2bfb-4d75-98ab-fb9bd33affcc}',
  'short': 'creation_time_to'
}, {
  'key': '{65f668d1-b070-494f-a9a3-7b6c3d370e65}',
  'short': 'acceptance_time_from'
}, {
  'key': '{0db7de9e-37fa-47a5-b087-0b1e6066ee86}',
  'short': 'acceptance_time_to'
}, {
  'key': '{1cb94319-9e1f-428e-993f-a78c78947f60}',
  'short': 'timenote'
}, {
  'key': '{8e820869-e338-4761-aa88-3dcd89f8cbae}',
  'short': 'archiveno'
}, {
  'key': '{d6025301-ef5e-4722-b101-78fd28262a98}',
  'short': 'topno'
}, {
  'key': '{8ac71e5d-5ca9-42cf-8c21-02c41e1af5cd}',
  'short': 'archivename'
}, {
  'key': '{9aef60d3-38b4-4e47-8104-d018b83ea6c6}',
  'short': 'object_number'
}, {
  'key': '{51b661a3-585e-4dbd-9e98-85e12ad91190}',
  'short': 'place'
}, {
  'key': '{24252838-de09-46e4-8f7d-f3fb85cde78f}',
  'short': 'city'
}, {
  'key': '{6fb1f61b-14a3-4851-bba0-cf7e71ef59cb}',
  'short': 'short_title'
}, {
  'key': '{af4b2e0c-5f6a-11d2-8f20-0000c0e166dc}',
  'short': 'categories'
}, {
  'key': '{659ca0c6-92d8-4f7a-af58-8a3c69df2ede}',
  'short': 'street'
}, {
  'key': '{ed64a9f8-8d19-4f60-a615-5bd3b188e98a}',
  'short': 'address'
}, {
  'key': '{5bbe594f-d029-4bb5-9c42-8f1ac8c94b7f}',
  'short': 'zipcode'
}, {
  'key': '{af4b2e02-5f6a-11d2-8f20-0000c0e166dc}',
  'short': 'modification_time'
}, {
  'key': '{a493be21-0f70-4cae-9394-703eca848bad}',
  'short': 'review_state'
}, {
  'key': '{bf7a30ac-e53b-4147-95e0-aea8c71340ca}',
  'short': 'cropping_status'
}, {
  'key': '{af4b2e71-5f6a-11d2-8f20-0000c0e166dc}',
  'short': 'related_sub_assets'
}, {
  'key': '{af4b2e72-5f6a-11d2-8f20-0000c0e166dc}',
  'short': 'related_master_assets'
}, {
  'key': '{05f6f3f0-833a-45a0-ade4-8e48542f37ef}',
  'short': 'width_px'
}, {
  'key': '{a89e881e-df7a-4c7c-9bf7-840bf3df707e}',
  'short': 'height_px'
}, {
  'key': '{af4b2e14-5f6a-11d2-8f20-0000c0e166dc}',
  'short': 'file_size'
}, {
  'key': '{af4b2e0d-5f6a-11d2-8f20-0000c0e166dc}',
  'short': 'file_format'
}, {
  'key': '{8286bf96-2694-4502-bbe2-9a99922766c6}',
  'short': 'negative_number'
}, {
  'key': '{1e29ca59-4022-43f3-9448-539a3da4097c}',
  'short': 'rating'
}];

exports.fieldMapping = fieldMapping;

function formatResult(fields) {
  var result = {};

  for (var i = 0; i < fieldMapping.length; ++i) {
    if (fieldMapping[i].key in fields) {
      result[fieldMapping[i].short] = fields[fieldMapping[i].key];
    }
  }

  return result;
}

exports.formatResult = formatResult;

function extendMetadata(subAssetMetadata, masterAssetMetadata) {
  // Overwrite where the original asset has no value.
  for (var f in subAssetMetadata) {
    var originalValue = subAssetMetadata[f];
    var masterValue = masterAssetMetadata[f];
    if (originalValue === null && masterValue !== null) {
      // Overwrite with the master assets value.
      subAssetMetadata[f] = masterValue;
    }
  }
  return subAssetMetadata;
}

exports.extendMetadata = extendMetadata;

// This expects that the related_master_assets has been parsed using the
// services/natmus-cip's parseBinaryRelations
function extendFromMaster(nm, metadata) {
  // We expect the formatted metadata to contain a binary field with related
  // master asset ids.

  var relatedMasterAssets = metadata.related_master_assets;

  if (!relatedMasterAssets ||
      relatedMasterAssets.length === 0) {
    return metadata;
  }
  // We expect only one master asset.
  if (relatedMasterAssets.length !== 1) {
    // Compile a textual representation of the master asset id's.
    var masterAssetSummary = JSON.stringify(relatedMasterAssets);
    throw new Error('Expected exactly one master asset, received ' +
      relatedMasterAssets.length + ': ' + masterAssetSummary);
  }
  // Deriving the single master asset id.
  var masterAssetId = relatedMasterAssets[0].id;

  return nm.getAsset(metadata.catalog, masterAssetId, true)
    .then(function(masterAsset) {
      var masterAssetMetadata = formatResult(masterAsset.fields);
      return extendMetadata(metadata, masterAssetMetadata);
    });
}

exports.extendFromMaster = extendFromMaster;
