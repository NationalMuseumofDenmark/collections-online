let helpers = {};

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
