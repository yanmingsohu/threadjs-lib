try {
  describe.call;
} catch(e) {
  return console.error('Please install "mocha" for test.',
    '\n[command] npm install mocha -g');
}

describe('Threadjs', function() {
  var assert = require('assert');

  it('basic', function() {
    var thlib = require('../');
    assert(thlib.v8version() != null, 'bad version');
  });

  require('./t-template.js');
  require('./t-ser.js');
  require('./test-event.js');

  require('./test-fn.js');
  require('./test-loop.js');
  require('./test-mult.js');
  require('./test-http.js');
  require('./test-wait.js');
  require('./test-eval.js');
  require('./t-binding.js');
  require('./t-native.js');
});
