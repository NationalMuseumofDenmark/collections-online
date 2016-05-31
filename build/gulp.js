module.exports = (gulp, config) => {

  //------------------------------------------
  // Require
  //------------------------------------------
  // sorted alphabetically after npm name
  var del = require('del');
  var fs = require('fs');
  var autoprefixer = require('gulp-autoprefixer');
  var concat = require('gulp-concat');
  var cleanCSS = require('gulp-clean-css');
  var gulpif = require('gulp-if');
  var print = require('gulp-print');
  var rename = require('gulp-rename');
  var sass = require('gulp-sass');
  var sourcemaps = require('gulp-sourcemaps');
  var svgmin = require('gulp-svgmin');
  var svgstore = require('gulp-svgstore');
  var uglify = require('gulp-uglify');
  var path = require('path');
  var sequence = require('run-sequence');
  var bower = require('gulp-bower');
  var uniqueFiles = require('gulp-unique-files');
  var watch = require('gulp-watch');

  //------------------------------------------
  // Directories - note that they are relative to the project specific gulpfile
  //------------------------------------------
  var DEST_DIR = config.generatedDir;
  var COLLECTIONS_ONLINE = __dirname + '/..';
  var BOWER_COMPONENTS_CO = COLLECTIONS_ONLINE + '/bower_components';
  var STYLES_SRC = config.appDir + '/styles/main.scss';
  var STYLES_ALL = config.appDir + '/styles/*.scss';
  var STYLES_DEST = DEST_DIR + '/styles';
  var SCRIPTS_FOLDER_CO = COLLECTIONS_ONLINE + '/app/scripts';
  var SCRIPTS_CO = SCRIPTS_FOLDER_CO + '/*.js';
  var SCRIPTS_ARRAY_CO = [SCRIPTS_CO];
  var SCRIPTS = config.appDir + '/scripts/*.js';
  var SCRIPTS_DEST = DEST_DIR + '/scripts';
  var SCRIPT_NAME = 'main.js';
  var SVG_SRC_CO = COLLECTIONS_ONLINE + '/app/images/icons/*.svg';
  var SVG_SRC = config.appDir + '/images/icons/*.svg';
  var SVG_DEST = DEST_DIR + '/images';
  var isProduction = process.env.NODE_ENV === 'production';

  // Scripts that are connected to a feature
  var FEATURE_SCRIPTS = {
    geotagging: ['geo-tagging.js'],
    rotationalImages: ['magic360.da.js', 'magic360.js'],
    crowdtagging: []
  };

  // Remove disabled feature scripts
  Object.keys(FEATURE_SCRIPTS).forEach((feature) => {
    if(config.features[feature] === false) {
      FEATURE_SCRIPTS[feature].forEach((script) => {
        SCRIPTS_ARRAY_CO.push('!' + SCRIPTS_FOLDER_CO + '/' + script);
      });
    }
  });

  // Add bower scripts
  var BOWER_SCRIPTS = [
    '/jquery/dist/jquery.js',
    '/ev-emitter/ev-emitter.js',
    '/imagesloaded/imagesloaded.js',
    '/jquery-infinite-scroll/jquery.infinitescroll.js',
    '/get-size/get-size.js',
    '/desandro-matches-selector/matches-selector.js',
    '/fizzy-ui-utils/utils.js',
    '/outlayer/item.js',
    '/outlayer/outlayer.js',
    '/masonry/masonry.js',
    '/picturefill/dist/picturefill.js',
    '/typeahead.js/dist/typeahead.bundle.js',
    '/scrollToTop/jquery.scrollToTop.js',
    '/slick-carousel/slick/slick.min.js',
    '/formatter.js/dist/jquery.formatter.min.js'
  ].map((script) => {
    return BOWER_COMPONENTS_CO + script;
  });


  SCRIPTS_ARRAY_CO = BOWER_SCRIPTS.concat(SCRIPTS_ARRAY_CO);

  // Add Project specific scripts at the end.
  // Overwrites thanks to uniqueFiles in the js task
  SCRIPTS_ARRAY_CO.push(SCRIPTS);

  var SCRIPTS_ALL = SCRIPTS_ARRAY_CO;


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
      .pipe(gulpif(!isProduction, sourcemaps.init()))
      .pipe(sass().on('error', sass.logError))
      .pipe(cleanCSS())
      .pipe(gulpif(!isProduction, sourcemaps.write()))
      .pipe(gulp.dest(STYLES_DEST));
  });

  gulp.task('js', function() {
    return gulp.src(SCRIPTS_ALL)
      .pipe(uniqueFiles())
      .pipe(gulpif(!isProduction, sourcemaps.init()))
      .pipe(concat(SCRIPT_NAME))
      .pipe(gulpif(isProduction, uglify()))
      .pipe(gulpif(!isProduction, sourcemaps.write()))
      .pipe(gulp.dest(SCRIPTS_DEST));
  });

  gulp.task('svg', function() {
    return gulp.src([SVG_SRC_CO, SVG_SRC])
      .pipe(uniqueFiles())
      .pipe(svgmin())
      .pipe(rename({prefix: 'icon-'}))
      .pipe(svgstore())
      .pipe(gulp.dest(SVG_DEST));
  });

  gulp.task('watch', function() {
    gulp.watch(STYLES_ALL, ['css']);
    gulp.watch(SVG_SRC, ['svg']);
    gulp.watch(SVG_SRC_CO, ['svg']);
    gulp.watch(SCRIPTS_ALL, ['js']);
  });

  gulp.task('clean', function() {
    return del([DEST_DIR]);
  });

  gulp.task('console', function() {
    console.log(SCRIPTS_ALL);
  });
};
