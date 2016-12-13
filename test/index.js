console.log('[BEGIN]');

var thlib = require('../');
console.log("V8:", thlib.v8version());

require('./test2.js').do(function() {
  require('./test3.js').do(function() {
    require('./test1.js').do(function() {
      require('./test-http.js').do(function() {
        require('./testwait.js').do();
      });
    });
  });
});
