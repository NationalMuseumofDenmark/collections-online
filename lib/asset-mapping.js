'use strict';

// TODO: Move this to the collections-online-cumulus package

var fields = require('./config').assetFields;

function transform(metadata) {
  var result = {};

  for (var i = 0; i < fields.length; ++i) {
    if (fields[i].cumulusKey in metadata) {
      result[fields[i].short] = metadata[fields[i].cumulusKey];
    }
  }

  return result;
}

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
      var masterAssetMetadata = transform(masterAsset.fields);
      return extendMetadata(metadata, masterAssetMetadata);
    });
}

exports.transform = transform;
exports.extendMetadata = extendMetadata;
exports.extendFromMaster = extendFromMaster;
