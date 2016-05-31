'use strict';

var fs = require('fs');
var assetLayoutConf = require('./config').assetLayout;
var _ = require('lodash');
var licenseMapping = require('./config').licenseMapping;
var config = require('./config');

var jade = require('./jade');

// Find all sections used in the configuration
var sections = config.assetLayout.sections;
var typesInConfiguration = _.flatten(
  Object.keys(sections).map((sectionName) => {
    var section = sections[sectionName];
    return section.rows.map((row) => {
      return row.type;
    });
  })
);

// Add the default single type and use only unique values
var types = _.uniq(_.concat(['simple'], typesInConfiguration))
.filter((type) => {
  return !!type; // Filter out undefined
});

// For every type a template should be compiled
var templates = {};
types.forEach((type) => {
  var relativeTemplatePath = 'includes/asset-row-types/' + type;
  var templatePath = jade.resolvePath(relativeTemplatePath);
  templates[type] = jade.compileFile(templatePath);
});

// Load the main assets sections template.
var assetSectionTemplatePath = jade.resolvePath('/includes/asset-section');
var assetSectionTemplate = jade.compileFile(assetSectionTemplatePath);

var helpers = {};

helpers.bool = function(val) {
  if (val) {
    return 'Ja';
  } else {
    return 'Nej';
  }
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

helpers.licenseLinked = function(license) {
  if (license) {
    var licenseMapped = licenseMapping[license.id];
    if (licenseMapped) {
      var url = licenseMapped.url;
      var text = licenseMapped.short;
      return helpers.link(url, text);
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
    return helpers.link(url, text);
  } else {
    return '';
  }
};


Object.keys(assetLayoutConf.sections).forEach((sectionName) => {
  var section = assetLayoutConf.sections[sectionName];

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
    row.template = row.template ? (options, metadata) => {
      var locals = {};
      _.assign(locals, metadata, options, helpers);
      return template(locals);
    } : null;

    row.render = (options, metadata) => {
      if(row.type in templates) {
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
      // The type map-coordinates should always be shown, if we want to show
      // call to actions
      // TODO: Move this to a less generic place.
      if (options.showCallToAction === true &&
          row.type === 'map-coordinates') {
        return true;
      }
      // If the rendered version of the row is different when given the
      // metadata, then we assume the row has a value.
      var withMetadata = row.render(options, metadata);
      var withoutMetadata = row.render(options, {});
      return row.render(options, metadata) !== row.render(options, {});
    };
  });
});

module.exports = (options) => {
  // Returns a function that renders the asset layout.
  return (sectionName, metadata) => {
    if(!sectionName || !(sectionName in assetLayoutConf.sections)) {
      throw new Error('Section named "' + sectionName + '" not configured');
    }
    // Returns the markup for the layout, rendering each of the sections.
    return assetSectionTemplate({
      section: assetLayoutConf.sections[sectionName],
      options: options,
      metadata: metadata
    });
  };
};
