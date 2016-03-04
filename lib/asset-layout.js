'use strict';

var fs = require('fs');
var assetLayoutConf = require('./config/asset-layout.json');
var jade = require('jade');
var _ = require('lodash');

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

const TYPES = {
  'simple': {
    'hasValue': (row, options, metadata) => {
      var withMetadata = options.templates.simple({
        row: row,
        options: options,
        metadata: metadata,
        helpers: helpers
      });
      var withoutMetadata = options.templates.simple({
        row: row,
        options: options,
        metadata: {},
        helpers: helpers
      });
      return withMetadata !== withoutMetadata;
    }
  },
  'date-interval': {
    'hasValue': (row, options, metadata) => {
      return metadata[row.fields.from] && metadata[row.fields.to];
    }
  },
  'changeable-coordinates': {
    'hasValue': (row, options, metadata) => {
      return metadata[row.fields.latitude] && metadata[row.fields.longitude];
    }
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

    if (Object.keys(TYPES).indexOf(row.type) === -1) {
      throw new Error('Unexpected item type: ' + row.type);
    } else {
      // Compile any template for later use & injecting the helpers
      var template = jade.compile(row.template);
      row.template = row.template ? function(options, metadata) {
        var locals = {};
        _.assign(locals, metadata, helpers);
        return template(locals);
      } : null;

      row.render = (options, metadata) => {
        if (row.type in options.templates) {
          return options.templates[row.type]({
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
        return TYPES[row.type].hasValue(row, options, metadata);
      };
    }
  });
});

const ASSET_SECTIONS_TEMPLATE_PATH = './app/views/includes/asset-sections.jade';
var assetSectionsTemplate = jade.compileFile(ASSET_SECTIONS_TEMPLATE_PATH);

module.exports = (options) => {
  var views = options.req.app.get('views');
  // Iterate the list of asset row type templates
  const TEMPLATES_PATH = views + '/asset-row-types/';
  options.templates = {};
  fs.readdirSync(TEMPLATES_PATH).forEach((templateFile) => {
    var templateName = templateFile.substring(0, templateFile.indexOf('.'));
    var templatePath = TEMPLATES_PATH + templateFile;
    options.templates[templateName] = jade.compileFile(templatePath);
  });
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
