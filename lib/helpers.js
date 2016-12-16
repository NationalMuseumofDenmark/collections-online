const fs = require('fs');
const config = require('./config');
const querystring = require('querystring');
const _ = require('lodash');

// Enabling the ability to load helpers that are shared between client and
// server from the appDir instead of the collections-online defaults.
const appDirHelpersPath = config.childPath + '/shared/helpers.js';
let helpers;
if(fs.existsSync(appDirHelpersPath)) {
  helpers = require(appDirHelpersPath);
} else {
  helpers = require('../shared/helpers');
}

// Here goes the server-side only helpers

function zeroPad(num) {
  num = String(num);
  if (num.length < 2) {
    num = '0' + num;
  }
  return num;
}

// Replace / add a query parameter to the base url
helpers.urlQuery = function(base, key, val) {
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

helpers.DMYToYDM = function(d) {
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

helpers.ensureYMD = function(d) {
  var dmy = helpers.ensureDMY(d);
  if (dmy !== null) {
    return helpers.DMYToYDM(dmy);
  }
  return null;
};

helpers.ensureDMY = function(d) {
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

helpers.getTwitterAccount = (asset) => {
  if(typeof(config.twitterAccount) == 'string') {
    return config.twitterAccount;
  } else if(typeof(config.twitterAccount) == 'object' && asset) {
    return config.twitterAccount[asset.catalog];
  } else {
    return null;
  }
};

helpers.getFacebookAppId = (asset) => {
  if(typeof(config.facebookAppId) == 'string') {
    return config.facebookAppId;
  } else if(typeof(config.facebookAppId) == 'object' && asset) {
    return config.facebookAppId[asset.catalog];
  } else {
    return null;
  }
};

helpers.licenseMapped = function(license) {
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

helpers.formatDate = function(date) {
  var points = [];
  if(date.day && date.month) {
    points.push(date.day + '.');
  }
  if(date.month) {
    var month = MONTHS[date.month-1];
    if(!date.day) {
      // Capitalize if the month is displayed first
      month = helpers.capitalizeFirstLetter(month);
    }
    points.push(month);
  }
  if(date.year) {
    points.push(date.year);
  }
  return points.join(' ');
};

helpers.link = function(url, text) {
  if(!text) {
    text = url;
  }
  return '<a href="' + url + '" target="_blank">' + text + '</a>';
};

helpers.decimals = function(n, decimals) {
  if (typeof(n) !== 'undefined' && n !== null) {
    return parseFloat(n).toFixed(decimals).replace('.', ',');
  } else {
    return n;
  }
};

helpers.filesizeMB = function(filesize) {
  if (filesize && filesize.value) {
    var mb = filesize.value / 1024 / 1024;
    // Formatted
    mb = helpers.decimals(mb, 1);
    return mb + ' MB';
  } else {
    return undefined;
  }
};

// TODO (start) should maybe be moved somewhere inside natmus
helpers.natmusFilesizeMB = function(filesize) {
  if (filesize) {
    var mb = filesize / 1024 / 1024;
    // Formatted
    mb = helpers.decimals(mb, 1);
    return mb + ' MB';
  } else {
    return undefined;
  }
};

helpers.creators = function(creators) {
  if (creators) {
    let creatorsList = [];
    creators.every(obj => creatorsList.push(obj.name));
    return creatorsList.join(', ');
  }
};

helpers.natmusLicenseLinked = function(license) {
  if (license) {
    let url = '';

    // Loop through the license map and get the matching url
    config.licenseMapping.map(obj => {
      if (obj && obj.short === license) {
        url = obj.url;
      }
    });

    // Return linked license if url was found otherwise just license or uknown.
    if (license && url) {
      return helpers.link(url, license);
    } else {
      return license || 'Ukendt';
    }
  }
};

helpers.collectionLinked = function(collection, collectionName) {
  let url = `/${collection}`;
  helpers.link(url, collectionName);
};
// TODO (end) should maybe be moved somewhere inside natmus


helpers.licenseLinked = function(license) {
  if (license) {
    var licenseMapped = config.licenseMapping[license.id];
    if (licenseMapped && licenseMapped.url && licenseMapped.short) {
      return helpers.link(licenseMapped.url, licenseMapped.short);
    } else {
      return license.displaystring || 'Ukendt';
    }
  } else {
    return '';
  }
};

helpers.catalogLinked = function(catalogs, catalogAlias) {
  if (catalogAlias) {
    var url = '/' + catalogAlias;
    var text = catalogs.reduce(function(name, catalog){
      if (name){
        return name;
      } else if (catalog.alias === catalogAlias) {
        return catalog.name;
      }
    }, null);
    return helpers.link(url, text);
  } else {
    return '';
  }
};

/**
 * Get the first of an array of paths
 */
helpers.getFirst = function(metadata, paths) {
  if(typeof(paths) === 'string') {
    paths = [paths];
  }
  return paths.reduce((result, path) => {
    return result || _.get(metadata, path);
  }, undefined);
};

helpers.get = function(metadata, path) {
  return _.get(metadata, path);
};

module.exports = helpers;
