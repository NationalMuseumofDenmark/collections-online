// Generated on 2014-05-05 using generator-angular-fullstack 1.4.2
'use strict';

module.exports = function (grunt) {
    // Load grunt tasks automatically
    require('load-grunt-tasks')(grunt);
    // Time how long tasks take. Can help when optimizing build times
    require('time-grunt')(grunt);
    // Define the configuration for all the tasks
    grunt.initConfig({

        // Project settings
        yeoman: {
            // configurable paths
            app: require('./bower.json').appPath || 'app',
            dist: 'dist'
        },
        express: {
            options: {
                port: process.env.PORT || 9000
            },
            dev: {
                options: {
                    script: 'server.js',
                    debug: true,
                    node_env: 'development'
                }
            },
            prod: {
                options: {
                    script: 'dist/server.js',
                    node_env: 'production'
                }
            }
        },
        open: {
            server: {
                url: 'http://localhost:<%= express.options.port %>'
            }
        },
        watch: {
            js: {
                files: ['<%= yeoman.app %>/scripts/{,*/}*.js'],
                tasks: ['newer:jshint:all'],
                options: {
                    livereload: true
                }
            },
            sass: {
                // TODO: Add the task needed for libsass to compile the .sass files
                files: ['<%= yeoman.app %>/styles/{,*/}*.{scss,sass}'],
                tasks: ['autoprefixer']
            },
            gruntfile: {
                files: ['Gruntfile.js']
            },
            livereload: {
                files: [
                    '<%= yeoman.app %>/views/{,*//*}*.{html,jade}',
                    '{.tmp,<%= yeoman.app %>}/styles/{,*//*}*.css',
                    '{.tmp,<%= yeoman.app %>}/scripts/{,*//*}*.js',
                    '<%= yeoman.app %>/images/{,*//*}*.{png,jpg,jpeg,gif,webp,svg}'
                ],

                options: {
                    livereload: true
                }
            },
            express: {
                files: [
                    'server.js',
                    'lib/**/*.{js,json}'
                ],
                tasks: ['newer:jshint:server', 'express:dev', 'wait'],
                options: {
                    livereload: true,
                    nospawn: true //Without this option specified express won't be reloaded
                }
            }
        },

        // Make sure code styles are up to par and there are no obvious mistakes
        jshint: {
            options: {
                jshintrc: '.jshintrc',
                reporter: require('jshint-stylish')
            },
            server: {
                options: {
                    jshintrc: 'lib/.jshintrc'
                },
                src: [ 'lib/{,*/}*.js']
            },
            all: [
                '<%= yeoman.app %>/scripts/{,*/}*.js'
            ],
        },

        // Empties folders to start fresh
        clean: {
            dist: {
                files: [{
                    dot: true,
                    src: [
                        '.tmp',
                        '<%= yeoman.dist %>/*',
                        '!<%= yeoman.dist %>/.git*',
                        '!<%= yeoman.dist %>/Procfile'
                    ]
                }]
            },
            server: '.tmp'
        },

        // Add vendor prefixed styles
        autoprefixer: {
            options: {
                browsers: ['last 1 version']
            },
            dist: {
                files: [{
                    expand: true,
                    cwd: '.tmp/styles/',
                    src: '{,*/}*.css',
                    dest: '.tmp/styles/'
                }]
            }
        },

        // Debugging with node inspector
        'node-inspector': {
            custom: {
                options: {
                    'web-host': 'localhost'
                }
            }
        },

        // Use nodemon to run server in debug mode with an initial breakpoint
        nodemon: {
            debug: {
                script: 'server.js',
                options: {
                    nodeArgs: ['--debug-brk'],
                    env: {
                        PORT: process.env.PORT || 9000
                    },
                    callback: function (nodemon) {
                        nodemon.on('log', function (event) {
                            console.log(event.colour);
                        });

                        // opens browser on initial server start
                        nodemon.on('config:update', function () {
                            setTimeout(function () {
                                require('open')('http://localhost:8080/debug?port=5858');
                            }, 500);
                        });
                    }
                }
            }
        },

        // Automatically inject Bower components into the app
        // The grunt-bower-install was renamed to wiredep.
        wiredep: {
            app: {
                src: '<%= yeoman.app %>/views/index.jade',
                ignorePath: '..',
                exclude: []
            },
            sass: {
                src: ['<%= yeoman.app %>/styles/{,*/}*.{scss,sass}']
            },
        },

        // Compiles Sass to CSS and generates necessary files if requested
        /*
        compass: {
            options: {
                sassDir: '<%= yeoman.app %>/styles',
                cssDir: '.tmp/styles',
                generatedImagesDir: '.tmp/images/generated',
                imagesDir: '<%= yeoman.app %>/images',
                javascriptsDir: '<%= yeoman.app %>/scripts',
                fontsDir: '<%= yeoman.app %>/styles/fonts',
                importPath: '<%= yeoman.app %>/bower_components',
                httpImagesPath: '/images',
                httpGeneratedImagesPath: '/images/generated',
                httpFontsPath: '/styles/fonts',
                relativeAssets: false,
                assetCacheBuster: false,
                raw: 'Sass::Script::Number.precision = 10\n'
            },
            dist: {
                options: {
                    generatedImagesDir: '<%= yeoman.dist %>/public/images/generated'
                }
            },
            server: {
                options: {
                    debugInfo: true
                }
            }
        },
        */
        // This replaces compass as it has Ruby dependencies.
        sass: {
            dist: {
                files: {
                    '.tmp/styles/main.css': '<%= yeoman.app %>/styles/main.scss'
                }
            }
        },

        // Renames files for browser caching purposes
        rev: {
            dist: {
                files: {
                    src: [
                        '<%= yeoman.dist %>/public/scripts/{,*/}*.js',
                        '<%= yeoman.dist %>/public/styles/{,*/}*.css',
                        // '<%= yeoman.dist %>/public/images/{,*/}*.{png,jpg,jpeg,gif,webp,svg}',
                        // '<%= yeoman.dist %>/public/styles/fonts/*'
                    ]
                }
            }
        },

        // Reads HTML for usemin blocks to enable smart builds that automatically
        // concat, minify and revision files. Creates configurations in memory so
        // additional tasks can operate on them
        useminPrepare: {
            html: ['<%= yeoman.app %>/views/index.html',
                '<%= yeoman.app %>/views/index.jade'],
            options: {
                dest: '<%= yeoman.dist %>/public',
                root: '.tmp'
            }
        },

        // Performs rewrites based on rev and the useminPrepare configuration
        usemin: {
            html: ['<%= yeoman.dist %>/views/{,*/}*.html',
                         '<%= yeoman.dist %>/views/{,*/}*.jade'],
            css: ['<%= yeoman.dist %>/public/styles/{,*/}*.css'],
            options: {
                assetsDirs: ['<%= yeoman.dist %>/public']
            }
        },

        // The following *-min tasks produce minified files in the dist folder
        imagemin: {
            options : {
                cache: false
            },
            dist: {
                files: [{
                    expand: true,
                    cwd: '<%= yeoman.app %>/images',
                    src: '{,*/}*.{png,jpg,jpeg,gif}',
                    dest: '<%= yeoman.dist %>/public/images'
                }]
            }
        },

        svgmin: {
            dist: {
                files: [{
                    expand: true,
                    cwd: '<%= yeoman.app %>/images',
                    src: '{,*/}*.svg',
                    dest: '<%= yeoman.dist %>/public/images'
                }]
            }
        },

        htmlmin: {
            dist: {
                options: {
                    //collapseWhitespace: true,
                    //collapseBooleanAttributes: true,
                    //removeCommentsFromCDATA: true,
                    //removeOptionalTags: true
                },
                files: [{
                    expand: true,
                    cwd: '<%= yeoman.app %>/views',
                    src: ['*.html', 'partials/**/*.html'],
                    dest: '<%= yeoman.dist %>/views'
                }]
            }
        },

        // Allow the use of non-minsafe AngularJS files. Automatically makes it
        // minsafe compatible so Uglify does not destroy the ng references
        // ngmin: {
        //     dist: {
        //         files: [{
        //             expand: true,
        //             cwd: '.tmp/concat/scripts',
        //             src: '*.js',
        //             dest: '.tmp/concat/scripts'
        //         }]
        //     }
        // },

        // Replace Google CDN references
        cdnify: {
            dist: {
                html: ['<%= yeoman.dist %>/views/*.html']
            }
        },

        // Copies remaining files to places other tasks can use
        copy: {
            dist: {
                files: [{
                    expand: true,
                    dot: true,
                    cwd: '<%= yeoman.app %>',
                    dest: '<%= yeoman.dist %>/public',
                    src: [
                        '*.{ico,png,txt}',
                        '.htaccess',
                        'images/{,*/}*.{webp,png,jpeg,jpg,svg,gif,cur}'
                    ]
                }, {
                    expand: true,
                    dot: true,
                    cwd: '<%= yeoman.app %>',
                    dest: '.tmp',
                    src: [
                        'bower_components/**/*',
                        'scripts/**/*',
                        'styles/*.css'
                    ]
                }, {
                    expand: true,
                    flatten: true,
                    dot: true,
                    cwd: '<%= yeoman.app %>/bower_components/',
                    dest: '<%= yeoman.dist %>/public/styles/fonts/',
                    src: [
                        '**/fonts/{bootstrap/,}*.eot',
                        '**/fonts/{bootstrap/,}*.svg',
                        '**/fonts/{bootstrap/,}*.ttf',
                        '**/fonts/{bootstrap/,}*.woff',
                    ]
                }, {
                    expand: true,
                    dot: true,
                    cwd: '<%= yeoman.app %>/views',
                    dest: '<%= yeoman.dist %>/views',
                    src: '**/*.jade'
                },{
                    expand: true,
                    dot: true,
                    cwd: '<%= yeoman.app %>/includes',
                    dest: '<%= yeoman.dist %>/includes',
                    src: '**/*.jade'
                },
                {
                    expand: true,
                    cwd: '.tmp/images',
                    dest: '<%= yeoman.dist %>/public/images',
                    src: ['generated/*']
                }, {
                    expand: true,
                    dest: '<%= yeoman.dist %>',
                    src: [
                        'package.json',
                        'server.js',
                        'lib/**/*'
                    ]
                }]
            }
        },

        // Run some tasks in parallel to speed up the build process
        concurrent: {
            server: [
                'sass'
            ],
            debug: {
                tasks: [
                    'nodemon',
                    'node-inspector'
                ],
                options: {
                    logConcurrentOutput: true
                }
            },
            dist: [
                'sass',
                'imagemin',
                'svgmin',
                'htmlmin'
            ]
        },


        // By default, your `index.html`'s <!-- Usemin block --> will take care of
        // minification. These next options are pre-configured if you do not wish
        // to use the Usemin blocks.

        // cssmin: {
        //     dist: {
        //         files: {
        //             '<%= yeoman.dist %>/public/styles/main.css': [
        //                 '.tmp/styles/{,*/}*.css',
        //                 '<%= yeoman.app %>/styles/{,*/}*.css'
        //             ]
        //         }
        //     }
        // },
        // uglify: {
        //     dist: {
        //         files: {
        //             '<%= yeoman.dist %>/public/scripts/main.js': [
        //                 '<%= yeoman.dist %>/public/scripts/main.js'
        //             ]
        //         }
        //     }
        // },
        // concat: {
        //     dist: { }
        // }
    });

    // Used for delaying livereload until after server has restarted
    grunt.registerTask('wait', function () {
        grunt.log.ok('Waiting for server reload...');

        var done = this.async();

        setTimeout(function () {
            grunt.log.writeln('Done waiting!');
            done();
        }, 500);
    });

    grunt.registerTask('express-keepalive', 'Keep grunt running', function() {
        this.async();
    });

    grunt.registerTask('serve', function (target) {
        if (target === 'dist') {
            return grunt.task.run(['build', 'express:prod', 'open', 'express-keepalive']);
        }

        if (target === 'debug') {
            return grunt.task.run([
                'clean:server',
                'wiredep',
                'concurrent:server',
                'autoprefixer',
                'concurrent:debug'
            ]);
        }

        grunt.task.run([
            'clean:server',
            'wiredep',
            'concurrent:server',
            'autoprefixer',
            'express:dev',
            //'open',
            'watch'
        ]);
    });

    grunt.registerTask('server', function () {
        grunt.log.warn('The `server` task has been deprecated. Use `grunt serve` to start a server.');
        grunt.task.run(['serve']);
    });


    grunt.registerTask('build', [
        'clean:dist',
        'wiredep',
        'useminPrepare',
        'concurrent:dist',
        'autoprefixer',
        'copy:dist',
        'concat',
        // 'ngmin',
        // 'cdnify',
        'cssmin',
        'uglify',
        'rev',
        'usemin'
    ]);

    grunt.registerTask('default', [
        'newer:jshint',
        'build'
    ]);
};
