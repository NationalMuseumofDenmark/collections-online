let helpers = {};

helpers.capitalizeFirstLetter = string => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

module.exports = helpers;
