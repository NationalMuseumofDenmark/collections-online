let helpers = {};

const REQUIRED_HELPERS = [
  'documentTitle',
  'documentDescription',
  'determinePlayer',
  'getDocumentURL',
  'getThumbnailURL',
  'getDownloadURL',
  'getDownloadOptions',
  'translate'
];

helpers.checkRequiredHelpers = () => {
  REQUIRED_HELPERS.forEach((requiredHelper) => {
    if(typeof(helpers[requiredHelper]) !== 'function') {
      throw new Error('Missing required helper function: ' + requiredHelper);
    }
  });
};

// TODO: Consider if a localization function might be easier to use
helpers.thousandsSeparator = (number) => {
  if(number) {
    return number.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1.');
  } else {
    return number;
  }
};

helpers.capitalizeFirstLetter = string => {
  if(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  } else {
    return string;
  }
};

module.exports = helpers;
