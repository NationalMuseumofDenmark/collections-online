'use strict';

var fs = require('fs');
var assetLayoutConf = require('./config/asset-layout.json');
var jade = require('jade');
var _ = require('lodash');
var licenseMapping = require('./config/license-mapping.json');
var config = require('./config/config');

// Iterate the list of asset row type templates
const TEMPLATES_PATH = config.root + config.viewsPath +
                                                '/includes/asset-row-types/';
var templates = {};
fs.readdirSync(TEMPLATES_PATH).forEach((templateFile) => {
  var templateName = templateFile.substring(0, templateFile.indexOf('.'));
  var templatePath = TEMPLATES_PATH + templateFile;
  templates[templateName] = jade.compileFile(templatePath);
});

var assetSectionsTemplate = jade.compileFile(config.root + config.viewsPath +
                                             '/includes/asset-sections.jade');

var helpers = {};

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

helpers.licenseLinked = function(license) {
  if (license) {
    var licenseMapped = licenseMapping[license.id];
    if (licenseMapped) {
      var url = licenseMapped.url;
      var text = licenseMapped.short;
      return '<a href="' + url + '" target="_blank">' + text + '</a>';
    } else {
      return license.displaystring || 'Ukendt';
    }
  } else {
    return '';
  }
  // licenseMapping
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
    return '<a href="' + url + '">' + text + '</a>';
  } else {
    return '';
  }
};


assetLayoutConf.sections.forEach((section) => {
  section.hasValues = (options, metadata) => {
    return section.rows.reduce((result, row) => {
      return result || row.hasValue(options, metadata);
    }, false);
  };

  section.rows.forEach((row) => {
    if (!row.type) {
      row.type = 'simple';
    }

    // Compile any template for later use & injecting the helpers
    var template = jade.compile(row.template);
    row.template = row.template ? function(options, metadata) {
      var locals = {};
      _.assign(locals, metadata, options, helpers);
      return template(locals);
    } : null;

    row.render = (options, metadata) => {
      if (row.type in templates) {
        return templates[row.type]({
          row: row,
          options: options,
          metadata: metadata,
          helpers: helpers
        });
      } else {
        throw new Error('Missing a template for row type: ' + row.type);
      }
    };

    row.hasValue = (options, metadata) => {
      // If the rendered version of the row is different when given the
      // metadata, then we assume the row has a value.
      return row.render(options, metadata) !== row.render(options, {});
    };
  });
});

module.exports = (options) => {
  // Returns a function that renders the asset layout.
  return (metadata) => {
    // Returns the markup for the layout, rendering each of the sections.
    return assetSectionsTemplate({
      sections: assetLayoutConf.sections,
      options: options,
      metadata: metadata
    });
  };
};
