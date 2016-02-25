'use strict';

/**
 * The processor handling a single asset.
 */

var Q = require('q'),
  path = require('path'),
  fs = require('fs'),
  _ = require('lodash'),
  assetMapping = require('../../lib/asset-mapping.js'),
  cip = require('../../lib/services/natmus-cip'),
  motif = require('../../lib/controllers/motif-tagging'),
  config = require('../../lib/config/config');

var DATA_REGEXP = new RegExp('\\d+');
var CM_PR_IN = 2.54;

const PREFIXED_NUMBERS_LETTERS_AND_DOTS = /^[\dA-Z\.]+ (- )?/;
const PREFIXED_SPECIAL_CASE_ONE = /^\w+\d\w\s-\s/;

const CONFIG_DIR = path.join(__dirname, '..', '..', 'lib', 'config');
const TAGS_BLACKLIST_PATH = path.join(CONFIG_DIR, 'tags-blacklist.txt');
var tagsBlacklist = fs.readFileSync(TAGS_BLACKLIST_PATH).toString();
// Remove any linebreak from Linux, Windows or Mac and seperate tags
    tagsBlacklist = tagsBlacklist.replace(/(\r\n|\n|\r)/gm,'\n').split('\n');

function relatedFilenameComparison(assetA, assetB) {
  var filenameA = assetA.filename;
  var filenameB = assetB.filename;
  return filenameA.localeCompare(filenameB);
}

// This list of transformations are a list of functions that takes two
// arguments (cip_client, metadata) and returns a mutated metadata, which
// is passed on to the next function in the list.
var METADATA_TRANSFORMATIONS = [
  function transform_field_names(state, metadata) {
    var transformedMetadata = assetMapping.format_result(metadata);
    // The catalog will be removed when formatting.
    transformedMetadata.catalog = metadata.catalog;
    return transformedMetadata;
  },
  function transform_modification_time(state, metadata) {
    var re_result = DATA_REGEXP.exec(metadata.modification_time);
    if (re_result && re_result.length > 0) {
      metadata.modification_time = parseInt(re_result[0], 10);
    }
    return metadata;
  },
  function transform_categories_and_derive_suggest(state, metadata) {
    // Transforms the categories.
    if (metadata.categories !== undefined) {
      metadata.categories_int = [];

      for (var j = 0; j < metadata.categories.length; ++j) {
        if (metadata.categories[j].path.indexOf('$Categories') !== 0) {
          continue;
        }
        var path = state.categories[metadata.catalog].get_path(metadata.categories[
          j].id);
        if (path) {
          for (var k = 0; k < path.length; k++) {
            metadata.categories_int.push(path[k].id);
            if (path[k].name.indexOf('$Categories') === 0) {
              continue;
            }
          }
        }
      }
    }
    return metadata;
  },
  function transform_relations(state, metadata) {
    // Transforms the binary representations of each relation.
    metadata.related_master_assets = cip.parseBinaryRelations(
      metadata.related_master_assets);
    metadata.related_sub_assets = cip.parseBinaryRelations(
      metadata.related_sub_assets);
    // Sort these by their filename.
    metadata.related_master_assets.sort(relatedFilenameComparison);
    metadata.related_sub_assets.sort(relatedFilenameComparison);
    return metadata;
  },
  function derive_in_artifact_rotation_series(state, metadata) {
    // Let's assume it's not.
    metadata.in_artifact_rotation_series = false;
    // Finds out if this asset is in a rotation series.
    // Initially looking at the assets categories - is this the front
    // facing asset in the rotation series?
    for (var c in metadata.categories) {
      var category = metadata.categories[c];
      if (category.name === 'Rotationsbilleder') {
        metadata.in_artifact_rotation_series = true;
        // The asset in Rotationsbilleder is always rank 0.
        metadata.artifact_rotation_series_rank = 0;
        return metadata;
      }
    }
    // Loop through the assets related master assets to find if a
    // master asset is in fact in the correct category to make this
    // asset a part of an artifact rotation series.
    var rotationalMasterAsset;
    for (var r in metadata.related_master_assets) {
      var masterAsset = metadata.related_master_assets[r];
      if (masterAsset.relation === '9ed0887f-40e8-4091-a91c-de356c869251') {
        rotationalMasterAsset = masterAsset;
      }
    }

    // TODO: Implement this as a post-processing step reading asset metadata
    // of related assets from the index instead of from the CIP.
    // If we found a rotational master asset.
    if (rotationalMasterAsset) {
      // Get the asset's metadata, to check it's categories.
      return cip.getAsset(state.cip, metadata.catalog, rotationalMasterAsset.id)
        .then(function(masterAsset) {
          var masterAssetMetadata = masterAsset.fields;
          masterAssetMetadata = assetMapping.format_result(
            masterAssetMetadata);
          for (var c in masterAssetMetadata.categories) {
            var category = masterAssetMetadata.categories[c];
            if (category.name === 'Rotationsbilleder') {
              metadata.in_artifact_rotation_series = true;
              // TODO: Consider computing the artifact_rotation_series_rank
              return metadata;
            }
          }
          return metadata;
        }, function(reason) {
          // An error occured when getting the master asset, let's not fail
          // on this sub-asset just because of that.
          console.error('Could not get the master asset', reason);
          // Let's return a new promise to overwrite the failed.
          return new Q(metadata);
        });
    } else {
      return metadata;
    }
  },
  function derive_dimensions_in_cm(state, metadata) {
    metadata.width_cm = metadata.width_in * CM_PR_IN;
    metadata.height_cm = metadata.height_in * CM_PR_IN;
    return metadata;
  },
  function derive_is_searchable(state, metadata) {
    // Compute a value on if it's drafted, part of a rotational series
    // or an original that has more representable croppings.
    // Adds an is_searchable field to the metadata.
    metadata.is_searchable = true; // Let's assume that it is.
    if (metadata.cropping_status &&
      metadata.cropping_status.id === 2) {
      // The croping status is 'has been cropped' / 'Er friskåret'
      metadata.is_searchable = false;
    } else if (!metadata.review_state ||
      (metadata.review_state.id !== 3 && metadata.review_state.id !== 4)) {
      // The asset's review state is neither 3 or 4 (public).
      metadata.is_searchable = false;
    } else if (metadata.in_artifact_rotation_series &&
      metadata.artifact_rotation_series_rank !== 0) {
      // The asset is part of a rotation series but it's not the front.
      metadata.is_searchable = false;
    }
    // Return the updated metedata.
    return metadata;
  },
  function derive_latitude_and_longitude(state, metadata) {
    var coordinates;
    if (metadata.google_maps_coordinates) {
      coordinates = metadata.google_maps_coordinates;
    } else if (metadata.google_maps_coordinates_crowd) {
      coordinates = metadata.google_maps_coordinates_crowd;
    }
    if (coordinates) {
      coordinates = coordinates.split(',').map(parseFloat);
      if (coordinates.length >= 2) {
        metadata.latitude = coordinates[0];
        metadata.longitude = coordinates[1];
      } else {
        throw new Error(
          'Encountered unexpected format when parsing coordinates.');
      }
    }
    return metadata;
  },
  function derive_tags(state, metadata) {
    var tagsPerCategory = metadata.categories.map(function(category) {
      var catalogsCategoryTree = state.categories[metadata.catalog];
      var path = catalogsCategoryTree.get_path(category.id) || [];
      return path.map(function(categoryOnPath) {
        var name = categoryOnPath.name;
        // Categories that starts with the dollar-sign are system categories.
        if (name.indexOf('$') === 0) {
          return null;
        }
        // Remove prefixed numbers, letters and dots.
        name = name.replace(PREFIXED_NUMBERS_LETTERS_AND_DOTS, '');
        // Remove special prefix e.g. "F01a - "
        name = name.replace(PREFIXED_SPECIAL_CASE_ONE, '');
        // We made it this far - let's consider tags lowercase only
        name = name.toLowerCase();
        // Don't include catalogs that are blacklisted.
        if (tagsBlacklist.indexOf(name) !== -1) {
          return null;
        }
        // Let's lower the case.
        return name;
      });
    });

    // Concat all the tags from every path into a single array.
    metadata.tags = _.union.apply(null, tagsPerCategory).filter(function(tag) {
      return !!tag; // Filter out null or undefined values.
    }).sort();

    return metadata;
  },
  function deriveVisionTags(state, metadata) {
    // Let's save some cost and bandwidth and not
    // analyze the asset if not explicitly told.
    if (!state.indexVisionTags) { return metadata; }

    // Let's grab the image directly from Cumulus
    var url = config.cipBaseURL + '/preview/thumbnail/' + metadata.catalog + '/' + metadata.id;

    return motif.fetchSuggestions(url).then(function (tags) {
      // Filter out tags that are blacklisted.
      var filteredTags = tags.filter(function (tag) {
        // Include the tag if it's not in the blacklist
        if (tagsBlacklist.indexOf(tag) === -1) {
          return true;
        }
      });

      metadata.visionTags = filteredTags;
      return metadata;
    });
  },
  /*function cracy_fails(state, metadata) {
  	throw new Error('Catch me if you can ... ' + metadata.id);
  }*/
];

function transformMetadata(state, metadata, transformations) {
  return transformations.reduce(function(metadata, transformation) {
    return Q.when(metadata).then(function(metadata) {
      return transformation(state, metadata);
    });
  }, new Q(metadata));
}

function processAsset(state, metadata, transformations) {
  //console.log('Processing an asset.');
  // Use all transformations by default.
  if (typeof(transformations) === 'undefined') {
    transformations = METADATA_TRANSFORMATIONS;
  }
  // Perform additional transformations and index the result.
  return transformMetadata(state, metadata, transformations)
    .then(function(metadata) {
      var es_id = metadata.catalog + '-' + metadata.id;
      return state.es.index({
        index: process.env.ES_INDEX || 'assets',
        type: 'asset',
        id: es_id,
        body: metadata
      });
    })
    .then(function(resp) {
      console.log('Successfully indexed ' + resp._id);
      return resp._id;
    }, function(err) {
      err.catalogAlias = metadata.catalog;
      err.assetId = metadata.id;
      console.error(err.stack);
      return err;
    });
}

module.exports = processAsset;
module.exports.METADATA_TRANSFORMATIONS = METADATA_TRANSFORMATIONS;
