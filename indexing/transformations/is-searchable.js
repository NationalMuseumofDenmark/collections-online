'use strict';

module.exports = function(state, metadata) {
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
};
