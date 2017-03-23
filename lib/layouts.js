'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const config = require('./config');
const pug = require('./pug')(config);

const helpers = require('./helpers.js');

const sectionPath = path.join('includes', 'section.pug');
const sectionTemplate = pug.compileFile(sectionPath);

const layouts = {

  section: (type) => {
    const typeConfiguration = config.types[type];
    assert.ok(typeConfiguration, 'Missing config.types[' + type + ']');
    assert.ok(typeConfiguration.layout,
              'Missing config.types[' + type + '].layout');

    // Create a copy of the layout from the configuration, to make sure we are
    // not mutating the config
    const layout = _.cloneDeep(typeConfiguration.layout);

    // Find all sections used in the configuration
    const sections = layout.sections;
    var typesInConfiguration = _.flatten(
      Object.keys(sections).map((sectionName) => {
        var section = sections[sectionName];
        return section.rows.map((row) => {
          return row.type;
        });
      })
    );

    // Add the default single type and use only unique values
    var rowTypes = _.uniq(_.concat(['simple'], typesInConfiguration))
    .filter((rowType) => {
      return !!rowType; // Filter out undefined
    });

    // For every type a template should be compiled
    const rowTypeTemplates = {};
    rowTypes.forEach((rowType) => {
      try {
        var relativePath = path.join('includes', 'row-types', rowType);
        rowTypeTemplates[rowType] = pug.compileFile(relativePath);
      } catch(err) {
        console.error('Error compiling asset row type template: ', err);
      }
    });

    Object.keys(layout.sections).forEach((sectionName) => {
      var section = layout.sections[sectionName];

      section.hasValues = (options, metadata) => {
        return section.rows.reduce((result, row) => {
          return result || row.hasValue(options, metadata);
        }, false);
      };

      section.rows.forEach((row) => {
        // Assume a simple row if type is not defined
        if (!row.type) {
          row.type = 'simple';
        }

        // Compile any template for later use & injecting the helpers
        var template = pug.compile(row.template);
        row.template = row.template ? (options, metadata) => {
          var locals = {};
          _.assign(locals, metadata, options, helpers);
          return template(locals);
        } : null;

        // Defining a render method on the row
        row.render = (options, metadata) => {
          if(row.type in rowTypeTemplates) {
            return rowTypeTemplates[row.type]({
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
          let withMetadata = row.render(options, metadata);
          let withoutMetadata;
          try {
            withoutMetadata = row.render(options, {});
          } catch(err) {
            throw new Error('Make sure the layout renders without metadata:\n' +
                            err.message);
          }
          return withMetadata !== withoutMetadata;
        };
      });
    });

    return (options) => {
      // Returns a function that renders the asset layout.
      return (sectionName, metadata) => {
        if(!sectionName || !(sectionName in layout.sections)) {
          throw new Error('Section named "' + sectionName + '" not configured');
        }
        // Returns the markup for the layout, rendering each of the sections.
        return sectionTemplate({
          section: layout.sections[sectionName],
          options: options,
          metadata: metadata
        });
      };
    };
  }
};

module.exports = layouts;
