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
th.on('error', function(e) {
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


var e2 = deferred();
th.on('e2', function(b) {
  var a = { thread: 'haha', a: 1 };
  try {
    assert.deepEqual(a, b, 'context fail');
    e2.resolve();
  } catch(e) {
    e2.reject(e);
  }
});
it('get context on thread', function(done) {
  e2.promise(done, done);
});


var e1 = deferred();
th.on('e1', function(d) {
  if (d == 2) {
    e1.resolve();
  } else {
    e1.reject(new Error('eval fail'));
  }
});
it('eval 1+1', function(done) {
  e1.promise(done, done);
});


var _end = deferred();
th.on('end', function() {
  if (success) _end.resolve();
  else _end.reject(new Error('not end yet'));
});
it('thread stoped', function(done) {
  _end.promise(done, done);
});



});
