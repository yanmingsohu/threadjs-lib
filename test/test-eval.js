describe('thread.eval()', function() {

var fs        = require('fs');
var thlib     = require('../');
var deferred  = require('deferred');
var assert    = require('assert');


var fname = __dirname + '/thread-eval.js';
var code = fs.readFileSync(fname, 'utf8');


var th = thlib.create(code, fname, thlib.default_lib);
var success;


var _err = deferred();
th.once('error', function(e) {
  if (e.message.indexOf('not_exists') >= 0) {
    success = 1;
    _err.resolve();
  } else {
    _err.reject(e);
  }
});
it('thread throws error', function(done) {
  _err.promise(done, done);
});


it('get context on thread', function(done) {
  var a = { thread: 'haha', a: 1 };

  _eval('this', function(e, b) {
    try {
      assert.deepEqual(a, b, 'context fail');
      done();
    } catch(e) {
      done(e);
    }
  });
});


it('eval a*b', function(done) {
  var tcode = Math.random() + ' * ' + Math.random();
  _eval(tcode, function(e, b) {
    try {
      assert.deepEqual(eval(tcode), b, 'context fail');
      done();
    } catch(e) {
      done(e);
    }
  });
});


it('eval "function() {}" not abort', function(done) {
  _eval('function() { return 1; }', function(e) {
    try {
      assert(e, 'must throw error');
      done();
    } catch(e) {
      done(e);
    }
  });
});


function _eval(code, cb) {
  th.once('eval', function(r) {
    if (r[0]) cb(r[0]);
    else cb(null, r[1]);
  });
  th.send('eval', code);
}


});
