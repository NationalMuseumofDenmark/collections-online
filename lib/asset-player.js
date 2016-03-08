'use strict';

var config = require('./config/config.js');

var querystring = require('querystring');

function determinePlayer(asset) {
  var format = (asset.file_format || '').toLowerCase();
  if (format === 'gif image') {
    return 'image-single-animated';
  } else if (format === 'mp3 format') {
    return 'audio';
  } else if (format.indexOf('video') !== -1) {
    return 'video';
  } else {
    var inRotationCategory = asset.categories.some(function(category) {
      return category.name === config.cipRotationCategoryName;
    });
    if (inRotationCategory) {
      return 'image-rotation';
    } else {
      // If the asset has no significant category, let's use the
      // image-single player.
      return 'image-single';
    }
  }
}

exports.determinePlayer = determinePlayer;

function rotaryImageComparison(assetA, assetB) {
  var filenameA = assetA.filename;
  var filenameB = assetB.filename;
  return filenameA.localeCompare(filenameB);
}

function generateRotationSources(req, metadata) {
  var rotaryAssets = [];

  for (var a in metadata.relatedAssets) {
    var relatedAsset = metadata.relatedAssets[a];
    if (relatedAsset.relation === '9ed0887f-40e8-4091-a91c-de356c869251') {
      rotaryAssets.push(relatedAsset);
    }
  }

  rotaryAssets.push({
    id: metadata.id,
    filename: metadata.filename
  });

  rotaryAssets.sort(rotaryImageComparison);

  var result = {
    small: [],
    large: []
  };

  for (var r in rotaryAssets) {
    var id = rotaryAssets[r].id;
    if (id) {
      var imageURL = '/' + metadata.catalog + '/' + id + '/image/';
      result.small.push(imageURL + '1000');
      result.large.push(imageURL + '3000');
    }
  }

  return result;
}

exports.generateRotationSources = generateRotationSources;

function generateSources(req, player, url, metadata) {
  var filename = metadata.filename;

  var sources = {
    download: url + '/download/' + filename,
    imageSet: [] // Default is no images.
  };

  if (player === 'image-single') {
    var itemTitle = metadata.short_title || 'Ingen titel';
    itemTitle = itemTitle.replace(/(\r\n|\n|\r)/gm, '');
    var dashedTitle = itemTitle.replace(/ /gi, '-').replace('/' ,'-');
    var encodedTitle = querystring.escape(dashedTitle);

    sources.image = url + '/image/2000/';
    sources.thumbnail = url + '/thumbnail';
    sources.imageSet = {
      400: url + '/image/400',
      800: url + '/image/800',
      1200: url + '/image/1200',
      2000: url + '/image/2000',
      // Downloads
      download400: url + '/download/400/' + encodedTitle + '.jpg',
      download800: url + '/download/800/' + encodedTitle + '.jpg',
      download1200: url + '/download/1200/' + encodedTitle + '.jpg',
      download2000: url + '/download/2000/' + encodedTitle + '.jpg'
    };
  } else if (player === 'image-single-animated') {
    sources.image = url + '/download/' + filename;
  } else if (player === 'image-rotation') {
    var rotationSources = generateRotationSources(req, metadata);
    sources.image = url + '/image/2000/';
    sources.imageRotationSet = rotationSources;
  } else if (player === 'audio') {
    sources.audio = sources.download;
  } else if (player === 'video') {
    sources.video = sources.download;
  }

  return sources;
}

exports.generateSources = generateSources;
