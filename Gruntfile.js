module.exports = function (grunt) {
  // load all grunt tasks
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks)

  grunt.initConfig({
    mochaTest: {
      test: {
        options: {
          reporter: 'spec',
          clearRequireCache: true,
          quiet: false
        },
        src: ['test/**/*.js']
      }
    },

    watch: {
      js: {
        options: {
          spawn: false
        },
        files: ['Gruntfile.js', 'lib/**/*.js', 'test/**/*.js'],
        tasks: ['mochaTest']
      }
    }
  })

  var defaultTestSrc = grunt.config('mochaTest.test.src')
  grunt.event.on('watch', function (action, filepath) {
    grunt.config('mochaTest.test.src', defaultTestSrc)
    if (filepath.match('test/')) {
      grunt.config('mochaTest.test.src', filepath)
    }
  })

  grunt.registerTask('default', 'mochaTest')
}
