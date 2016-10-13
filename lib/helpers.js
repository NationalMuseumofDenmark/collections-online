var querystring = require('querystring');
var config = require('./config');
var _ = require('lodash');

function zeroPad(num) {
  num = String(num);
  if (num.length < 2) {
    num = '0' + num;
  }
  return num;
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Replace / add a query parameter to the base url
exports.urlQuery = function(base, key, val) {
  var params = {};
  var queryPos = base.indexOf('?');
  if (queryPos !== -1) {
    // Add one to also cut `?`
    params = querystring.parse(base.substr(queryPos + 1));
    base = base.substr(0, queryPos);
  }

  if (val !== undefined) {
    params[key] = val;
  } else {
    delete params[key];
  }

  return `${base}?${querystring.stringify(params)}`;
};

exports.DMYToYDM = function(d) {
  var parts = [];
  if (d.indexOf('/') !== -1) {
    parts = d.split('\/');
  } else if (d.indexOf('-') !== -1) {
    parts = d.split('\-');
  }

  var day = zeroPad(parts[0]);
  var month = zeroPad(parts[1]);
  var year = zeroPad(parts[2]);

  return `${year}-${month}-${day}`;
};

exports.ensureYMD = function(d) {
  var dmy = exports.ensureDMY(d);
  if (dmy !== null) {
    return exports.DMYToYDM(dmy);
  }
  return null;
};

exports.ensureDMY = function(d) {
  if (!d) {
    return null;
  }

  var parts = [];
  var output = '';
  if (d.indexOf('/') !== -1) {
    parts = d.split('\/');
  } else if (d.indexOf('-') !== -1) {
    parts = d.split('\-');
  }

  console.log(parts);

  if (parts.length === 3) {
    if (parts[2].length === 4) {
      return parts[0] +'-'+ parts[1] +'-'+ parts[2];
    } else {
      return parts[2] +'-'+ parts[1] +'-'+ parts[0];
    }
  }
  return null;
};

exports.getTwitterAccount = (asset) => {
  if(typeof(config.twitterAccount) == 'string') {
    return config.twitterAccount;
  } else if(typeof(config.twitterAccount) == 'object' && asset) {
    return config.twitterAccount[asset.catalog];
  } else {
    return null;
  }
};

exports.getFacebookAppId = (asset) => {
  if(typeof(config.facebookAppId) == 'string') {
    return config.facebookAppId;
  } else if(typeof(config.facebookAppId) == 'object' && asset) {
    return config.facebookAppId[asset.catalog];
  } else {
    return null;
  }
};

exports.licenseMapped = function(license) {
  if(license && license.id) {
    return _.extend(license, config.licenseMapping[license.id]);
  } else {
    return license;
  }
};

const MONTHS = [
  'januar', 'februar', 'marts', 'april', 'maj', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'december'
];

exports.formatDate = function(date) {
  var points = [];
  if(date.day && date.month) {
    points.push(date.day + '.');
  }
  if(date.month) {
    var month = MONTHS[date.month-1];
    if(!date.day) {
      // Capitalize if the month is displayed first
      month = capitalizeFirstLetter(month);
    }
    points.push(month);
  }
  if(date.year) {
    points.push(date.year);
  }
  return points.join(' ');
};

exports.magic360Options = function(imageRotationSet) {
  var smallImages = imageRotationSet.small;
  var largeImages = imageRotationSet.large;
  var options = {
    'magnifier-shape': 'circle',
    'magnifier-width': '100%',
    'columns': smallImages.length,
    'images': smallImages.join(' '),
    'large-images': largeImages.join(' ')
  };
  var result = '';
  for (var o in options) {
    result += o + ': ' + options[o] + '; ';
  }
  return result;
};
