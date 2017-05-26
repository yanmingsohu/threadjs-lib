describe('Lock thread', function() {

var deferred  = require('deferred');
var fs        = require('fs');
var thlib     = require('../');
var assert    = require('assert');

var fname = __dirname + '/thread-wait.js';
var code  = fs.readFileSync(fname, 'utf8');
var waitc = 1000;


test('_thread_locked', 'lock1');
test('NamedWait', 'lock2');


function test(name, lockname) {
  var th = thlib.create(code, fname, thlib.default_lib);
  var b = Math.random() + '';
  var a = Math.random() + '';


  it('lock() with "' + name + '", wait:' + waitc +'ms', function() {
    th.send(lockname, a);
  });


  var _thread_locked = deferred();
  th.on(name, function(wait_arg) {
    try {
      if (wait_arg) assert(wait_arg === a);
      setTimeout(function() {
        th.notify(b);
        _thread_locked.resolve();
      }, waitc);
    } catch(e) {
      _thread_locked.reject(e);
    }
  });
  it('notify() when thread locked "' + name + '"', function(done) {
    this.timeout(waitc * 1.5);
    _thread_locked.promise(done, done);
  });


  var unlock = deferred();
  th.on(b, function(ret) {
    try {
      assert.deepEqual(ret, [a, b]);
      unlock.resolve();
    } catch(e) {
      unlock.reject(e);
    }
  });
  it('wait unlock "' + name + '"', function(done) {
    unlock.promise(done, done);
  });
}


});
