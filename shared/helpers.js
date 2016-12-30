const config = require('./config');
let helpers = {};

const REQUIRED_HELPERS = [
  'determinePlayer',
  'documentDescription',
  'documentLicense',
  'documentTitle',
  'generateSitemapElements',
  'getDownloadOptions',
  'isDownloadable',
  'isWatermarkRequired'
];

helpers.capitalizeFirstLetter = string => {
  if(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  } else {
    return string;
  }
};

helpers.checkRequiredHelpers = () => {
  REQUIRED_HELPERS.forEach((requiredHelper) => {
    if(typeof(helpers[requiredHelper]) !== 'function') {
      throw new Error('Missing required helper function: ' + requiredHelper);
    }
  });
};

helpers.decimals = function(n, decimals) {
  if (typeof(n) !== 'undefined' && n !== null) {
    return parseFloat(n).toFixed(decimals).replace('.', ',');
  } else {
    return n;
  }
};

helpers.getDocumentURL = (metadata) => {
  let path = [metadata.collection];
  if(Object.keys(config.types).length > 1) {
    path.push(metadata.type);
  }
  path.push(metadata.id);
  return '/' + path.join('/');
};

helpers.getThumbnailURL = (metadata, size) => {
  let path = [
    helpers.getDocumentURL(metadata),
    'thumbnail'
  ];
  if(size) {
    path.push(size);
  }
  return path.join('/');
};

helpers.getDownloadURL = (metadata, size) => {
  let path = [
    helpers.getDocumentURL(metadata),
    'download'
  ];
  if(size) {
    path.push(size);
  }
  return path.join('/');
};

helpers.getAbsoluteURL = (req, relativePath) => {
  return req.protocol + '://' + req.get('host') + relativePath;
};

helpers.getDirectDownloadURL = (metadata) => {
  if(!config.cip || !config.cip.baseURL) {
    throw new Error('Expected the baseURL of the CIP to be configered');
  }
  return [
    config.cip.baseURL,
    'asset',
    'download',
    metadata.collection,
    metadata.id
  ].join('/');
};

helpers.licenseMapped = (metadata) => {
  let license = helpers.documentLicense(metadata);
  if(license) {
    return config.licenseMapping[license];
  } else {
    return null;
  }
};

helpers.licenseLinked = function(license) {
  if (license && license in config.licenseMapping) {
    const licenseOptions = config.licenseMapping[license];
    return helpers.link(licenseOptions.url, license);
  } else {
    return license || 'Ukendt';
  }
};

helpers.link = function(url, text) {
  if(!text) {
    text = url;
  }
  return '<a href="' + url + '" target="_blank">' + text + '</a>';
};

// TODO: Consider if a localization function might be easier to use
helpers.thousandsSeparator = (number) => {
  if(number) {
    return number.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1.');
  } else {
    return number;
  }
};

helpers.translate = key => {
  if(config.translations[key]) {
    return config.translations[key];
  } else {
    return key;
  }
};
module.exports = helpers;
