const helpers = require('../../../shared/helpers');

let assetId = $('.document').data('id');
let searchHits = window.sessionStorage.getItem('lastSearch');

let assetIndex;
let nextHit;
let previousHit;

if(assetId && searchHits) {
  let searchHits = JSON.parse(searchHits).hits;

  assetIndex = searchHits.findIndex((hit) => {
    return assetId == hit['_source']['id'];
  });

  if(assetIndex > 0) previousHit = searchHits[assetIndex-1]['_source'];
  if(assetIndex < searchHits.length) nextHit = searchHits[assetIndex+1]['_source'];

  if(previousHit) console.log("Previous asset: ", helpers.getDocumentURL(previousHit));
  if(nextHit) console.log("Next asset: ", helpers.getDocumentURL(nextHit));
}
