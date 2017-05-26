describe('Test Event / Function', function() {

var fs        = require('fs');
var thlib     = require('../');
var deferred  = require('deferred');
var assert    = require('assert');

var fname = __dirname + '/thread-fn.js';
var code2 = fs.readFileSync(fname, 'utf8');
var wait_time = 1000;


it('thread stop()',
  testStopThread);

it('no events then stop thread, and send while error.',
  testNullScript);

it('when remove all listener, stopd',
  testOffEvent);

it('remove some listener not all, always running, wait:'+ wait_time +'ms',
  testOffEvent2);



function testStopThread(done) {
  var loopcode = 'thread.on("some", function() {})';
  var th = thlib.create(loopcode, '.js');

  th.on('error', function(e) {
    done(new Error(e.message));
  });

  th.on('end', function() {
    done();
  });

  th.stop();
}


function testNullScript(done) {
  var code  = "return";
  var th = thlib.create(code, 'do-nothing.js', thlib.default_lib);

  th.on('error', function(e) {
    if (e.message.indexOf('thread is closed') >= 0) {
      done();
    } else {
      done(new Error(e.message));
    }
  });

  th.on('end', function() {
    th.send("notesend", "!");
  });
}


function testOffEvent(done) {
  var th = thlib.create(code2, fname, thlib.default_lib);

  th.on('end', function() {
    done();
  });

  th.on('error', function(e) {
    done(e);
  });

  th.send('remove_all', '!');
}


function testOffEvent2(done) {
  var th = thlib.create(code2, fname, thlib.default_lib);
  var success;
  this.timeout(wait_time*1.5);

  var tid = setTimeout(function() {
    success = true;
    th.stop();
  }, wait_time);

  th.on('end', function() {
    clearTimeout(tid);
    if (!success) {
      done(new Error('bad: has event listener but stopd'));
    } else {
      done();
    }
  });

  th.on('error', function(e) {
    done(e);
  });

  th.send('remove_some', '!');
}

});
