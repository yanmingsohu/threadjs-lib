console.log('[BEGIN]');

var thlib = require('../');
console.log("V8:", thlib.v8version(), '\n');
console.error = function() {
  console.log('\u001B[31m');
  console.log.apply(console, arguments);
  console.log('\u001B[39m');
}

require('./event.js');
require('./parse.js');

require('./test-fn.js').do(function() {
  require('./test-loop.js').do(function() {
    require('./test-mult.js').do(function() {
      require('./test-http.js').do(function() {
        require('./testwait.js').do();
      });
    });
  });
});
