module.exports = (gulp, childPath) => {
  const config = require('../lib/config');
  config.setChildPath(childPath);

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
  var pug = require('gulp-pug');
  var browserify = require('browserify');
  var source = require('vinyl-source-stream');
  var customPug = require('./custom-pug.js')(config);

  //------------------------------------------
  // Directories - note that they are relative to the project specific gulpfile
  //------------------------------------------
  var DEST_DIR = path.join(childPath, 'generated');
  var ROOT_CO = __dirname + '/..';
  var BOWER_COMPONENTS_CO = ROOT_CO + '/bower_components';
  var STYLES_SRC = childPath + '/app/styles/main.scss';
  var STYLES_ALL = [
    childPath + '/app/styles/*.scss',
    ROOT_CO + '/app/styles/**/*.scss'
  ];
  var STYLES_DEST = DEST_DIR + '/styles';
  var SCRIPTS_FOLDER_CO = ROOT_CO + '/app/scripts';
  var SCRIPTS_CO = SCRIPTS_FOLDER_CO + '/*.js';
  var SCRIPTS_ARRAY_CO = [SCRIPTS_CO];
  var SCRIPTS = childPath + '/app/scripts/*.js';
  var SCRIPTS_DEST = DEST_DIR + '/scripts';
  var SCRIPT_NAME = 'main.js';
  var SVG_SRC_CO = ROOT_CO + '/app/images/icons/*.svg';
  var SVG_SRC = childPath + '/app/images/icons/*.svg';
  var SVG_DEST = DEST_DIR + '/images';
  var PUG_SRC_CO = ROOT_CO + '/app/views/**/*.pug';
  var PUG_SRC = childPath + '/app/views/**/*.pug';
  var PUG_DEST = DEST_DIR + '/views';
  var isProduction = process.env.NODE_ENV === 'production';

  // Scripts that are connected to a feature
  // TODO: Transition this to browserified scripts, checking the config
  // parameter instead.
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

  // Add the runtime lib used to run pug templates
  var SCRIPTS_BROWSERIFY_DIR_CO = ROOT_CO + '/app/scripts-browserify';
  var SCRIPTS_BROWSERIFY_DIR = childPath + '/app/scripts-browserify';

  var SCRIPTS_ALL = SCRIPTS_ARRAY_CO;

  gulp.task('reload-config', function() {
    config.reload();
  });

  // Return only
  //------------------------------------------
  // Individual tasks
  //------------------------------------------
  gulp.task('bower', function() {
    return bower({cwd: ROOT_CO});
  });

  gulp.task('css', function() {
    return gulp.src(STYLES_SRC)
      .pipe(gulpif(!isProduction, sourcemaps.init()))
      .pipe(sass().on('error', sass.logError))
      .pipe(cleanCSS())
      .pipe(autoprefixer({browsers: ['last 4 versions']}))
      .pipe(gulpif(!isProduction, sourcemaps.write()))
      .pipe(gulp.dest(STYLES_DEST));
  });

  gulp.task('js-browserify', ['pug'], function() {
    return browserify({
      paths: [
        SCRIPTS_BROWSERIFY_DIR,
        SCRIPTS_BROWSERIFY_DIR_CO,
        DEST_DIR
      ],
      basedir: SCRIPTS_BROWSERIFY_DIR,
      entries: './index.js',
      insertGlobalVars: {
        config: function(file, dir) {
          return JSON.stringify({
            es: config.es,
            features: config.features,
            googleAnalyticsPropertyID: config.googleAnalyticsPropertyID,
            search: config.search,
            sortOptions: config.sortOptions,
            types: config.types
          });
        }
      },
      debug: !isProduction
    }).bundle()
      .pipe(source('browserify-index.js'))
      .pipe(gulp.dest(SCRIPTS_DEST));
  });

  gulp.task('js', ['js-browserify'], function() {
    var scriptPaths = SCRIPTS_ARRAY_CO.concat([
      SCRIPTS_DEST + '/browserify-index.js'
    ]);
    return gulp.src(scriptPaths)
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

  gulp.task('pug', function() {
    return gulp.src([PUG_SRC_CO, PUG_SRC])
      .pipe(uniqueFiles())
      .pipe(pug({
        client: true,
        compileDebug: !isProduction,
        pug: customPug
      }))
      .pipe(gulp.dest(PUG_DEST));
  });

  gulp.task('watch', function() {
    gulp.watch(STYLES_ALL, ['css']);
    gulp.watch([SVG_SRC, SVG_SRC_CO], ['svg']);
    gulp.watch([PUG_SRC_CO, PUG_SRC], ['js']);
    gulp.watch([
      SCRIPTS_ALL,
      SCRIPTS_BROWSERIFY_DIR_CO + '/**/*.js',
      SCRIPTS_BROWSERIFY_DIR + '/**/*.js',
      childPath + '/config/**/*',
      childPath + '/shared/*.js'
    ], ['reload-config', 'js']);
  });

  gulp.task('clean', function() {
    return del([DEST_DIR]);
  });

  gulp.task('console', function() {
    console.log(SCRIPTS_ALL);
  });
};
