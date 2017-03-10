var Q = require('q');

var testResults = [
  // require('./test-dependants').run()
];

Q.all(testResults).then((passed) => {
  if(passed) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}, (err) => {
  console.error(err);
  process.exit(1);
});
