let helpers = {};

helpers.capitalizeFirstLetter = string => {
  if(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  } else {
    return string;
  }
};

module.exports = helpers;
