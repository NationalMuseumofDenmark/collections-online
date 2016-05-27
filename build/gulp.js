module.exports = (gulp, config) => {

  //------------------------------------------
  // Require
  //------------------------------------------
  // sorted alphabetically after npm name
  var del = require('del');
  var fs = require('fs');
  var autoprefixer = require('gulp-autoprefixer');
  var concat = require('gulp-concat');
  var print = require('gulp-print');
  var sass = require('gulp-sass');
  var sourcemaps = require('gulp-sourcemaps');
  var svgmin = require('gulp-svgmin');
  var svgstore = require('gulp-svgstore');
  var uglify = require('gulp-uglify');
  var gutil = require('gulp-util');
  var path = require('path');
  var sequence = require('run-sequence');
  var bower = require('gulp-bower');
  var uniqueFiles = require('gulp-unique-files');

  //------------------------------------------
  // Directories - note that they are relative to the project specific gulpfile
  //------------------------------------------
  var DEST_DIR = config.generatedDir;
  var COLLECTIONS_ONLINE = __dirname + '/..';
  var STYLES_SRC = '/app/styles/main.scss';
  var STYLES_DEST = DEST_DIR + '/styles';
  var SCRIPTS_FOLDER = COLLECTIONS_ONLINE + '/app/scripts';
  var SCRIPTS_ALL = SCRIPTS_FOLDER + '/*.js';
  var SCRIPTS = [SCRIPTS_ALL];
  // Blacklisting scripts - this should be done smarter at some point
  var SCRIPTS_DEST = DEST_DIR + '/scripts';
  var SCRIPT_NAME = 'main.js';
  var SVG_SRC_CO = COLLECTIONS_ONLINE + '/app/images/icons/*.svg';
  var SVG_SRC = './app/images/icons/*.svg';
  var SVG_DEST = DEST_DIR + '/images';

  var FEATURE_SCRIPTS = {
    geotagging: ['geo-tagging.js'],
    rotationalImages: ['magic360.da.js', 'magic360.js'],
    crowdtagging: []
  };

  // Remove disabled feature scripts
  Object.keys(FEATURE_SCRIPTS).forEach((feature) => {
    if(config.features[feature] === false) {
      FEATURE_SCRIPTS[feature].forEach((script) => {
        SCRIPTS.push('!' + SCRIPTS_FOLDER + '/' + script);
      });
    }
  });


  // Return only
  //------------------------------------------
  // Individual tasks
  //------------------------------------------
  gulp.task('bower', function() {
    return bower({cwd: COLLECTIONS_ONLINE});
  });

  gulp.task('css', function() {
    return gulp.src(STYLES_SRC)
      .pipe(autoprefixer({browsers: ['last 2 versions']}))
      .pipe(sourcemaps.init())
      .pipe(sass().on('error', sass.logError))
      .pipe(sourcemaps.write())
      .pipe(gulp.dest(STYLES_DEST));
  });

  gulp.task('js', function() {
    return gulp.src(SCRIPTS)
      .pipe(sourcemaps.init())
      .pipe(concat(SCRIPT_NAME))
      .pipe(uglify())
      .pipe(sourcemaps.write())
      .pipe(gulp.dest(SCRIPTS_DEST));
  });

  gulp.task('svg', function() {
    return gulp.src([SVG_SRC_CO, SVG_SRC])
      .pipe(uniqueFiles())
      .pipe(svgmin(function(file) {
        var prefix = path.basename(file.relative, path.extname(file.relative));
        return {
          plugins: [{
            cleanupIDs: {
              prefix: prefix + '-',
              minify: true
            }
          }]
        };
      }))
      .pipe(svgstore())
      .pipe(gulp.dest(SVG_DEST));
  });

  gulp.task('clean', function() {
    return del([DEST_DIR]);
  });

  gulp.task('console', function() {
    console.log(SVG_SRC);
  });

};
