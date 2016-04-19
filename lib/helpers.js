var querystring = require('querystring');

function zeroPad(num) {
  num = String(num);
  if (num.length < 2) {
    num = '0' + num;
  }
  return num;
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
