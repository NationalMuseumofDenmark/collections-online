module.exports = (gulp) => {

  //------------------------------------------
  // Require
  //------------------------------------------
  // sorted alphabetically after npm name
  var del = require('del');
  var fs = require('fs');
  var autoprefixer = require('gulp-autoprefixer');
  var concat = require('gulp-concat');
  var sass = require('gulp-sass');
  var sourcemaps = require('gulp-sourcemaps');
  var svgmin = require('gulp-svgmin');
  var svgstore = require('gulp-svgstore');
  var uglify = require('gulp-uglify');
  var gutil = require('gulp-util');
  var path = require('path');
  var sequence = require('run-sequence');

  //------------------------------------------
  // Directories - note that they are relative to the project specific gulpfile
  //------------------------------------------
  var DEST_DIR = 'generated/';
  var COLLECTIONS_ONLINE = 'node_modules/collections-online/';
  var STYLES_SRC = 'app/styles/main.scss';
  var STYLES_DEST = DEST_DIR + 'styles';
  var SCRIPTS_FOLDER = COLLECTIONS_ONLINE + 'app/scripts/';
  var SCRIPTS_CUSTOM = SCRIPTS_FOLDER + '*.js';
  // Blacklisting scripts - this should be done smarter at some point
  var SCRIPT_NO_1 = '!' + SCRIPTS_FOLDER + 'geo-tagging.js';
  var SCRIPTS_DEST = DEST_DIR + 'scripts';
  var SCRIPT_NAME = 'main.js';
  var SVG_SRC = COLLECTIONS_ONLINE + 'app/images/icons/*.svg';
  var SVG_DEST = DEST_DIR + 'images';

  //------------------------------------------
  // Individual tasks
  //------------------------------------------
  gulp.task('css', function() {
    return gulp.src(STYLES_SRC)
      .pipe(autoprefixer({browsers: ['last 2 versions']}))
      .pipe(sourcemaps.init())
      .pipe(sass().on('error', sass.logError))
      .pipe(sourcemaps.write())
      .pipe(gulp.dest(STYLES_DEST));
  });

  gulp.task('js', function() {
    return gulp.src([SCRIPTS_CUSTOM, SCRIPT_NO_1])
      .pipe(sourcemaps.init())
      .pipe(concat(SCRIPT_NAME))
      .pipe(uglify())
      .pipe(sourcemaps.write())
      .pipe(gulp.dest(SCRIPTS_DEST));
  });

  gulp.task('svg', function() {
    return gulp.src(SVG_SRC)
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

};
