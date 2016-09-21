// Load environment variables
var path = require('path');
var Q = require('q');
require('dotenv').config({
  silent: true,
  path: path.join(__dirname, '..', '.env')
});

if(!process.env.CIRCLE_TOKEN) {
  throw new Error('Need a CIRCLE_TOKEN environment variable');
}

const POLL_INTERVAL = 5000; // Every five seconds

var CircleCI = require('circleci');
var ci = new CircleCI({
  auth: process.env.CIRCLE_TOKEN
});

var dependants = require('./dependants');

module.exports.run = function() {
  var dependantBuilds = dependants.map((dependant) => {
    if(dependant.ci === 'circleci') {
      console.log('Testing the dependant:', dependant.project);
      return ci.startBuild({
        username: dependant.username,
        project: dependant.project,
        branch: dependant.branch,
        body: {
          build_parameters: {
            collections_online_sha1: process.env.CIRCLE_SHA1 ||
                                     require('git-rev-sync').long()
          }
        }
      }).then(function(build){
        var prefix = '[' + build.reponame + ']';
        var steps = [];
        console.log(prefix, 'Started build #' + build.build_num);
        // Keep polling for changes to the status
        var deferred = Q.defer();
        setInterval(() => {
          ci.getBuild({
            username: build.username,
            project: build.reponame,
            build_num: build.build_num,
          }).then((updatedBuild) => {
            for(var s = steps.length; s < updatedBuild.steps.length; s++) {
              var newStep = updatedBuild.steps[s];
              console.log(prefix, newStep.name);
              steps.push(newStep);
            }
            // When finished, resolve or reject the promise
            if(updatedBuild.lifecycle === 'finished') {
              console.log(prefix, 'FINISHED: ', updatedBuild.outcome);
              deferred.resolve(updatedBuild);
            }
          });
        }, POLL_INTERVAL);
        return deferred.promise;
      });
    } else {
      throw new Error('Unsupported continuous integration platform');
    }
  });

  return Q.all(dependantBuilds).then((builds) => {
    // If all pass, the test pass
    return builds.reduce((previousPassed, build) => {
      return previousPassed && build.outcome === 'success';
    }, true);
  });
};
