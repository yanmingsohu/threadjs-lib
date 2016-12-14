var fs = require('fs');
var thlib = require('../');
var code = "return";

var fname = __dirname + '/thread-fn.js';
var code2 = fs.readFileSync(fname, 'utf8');


module.exports.do = function(_over) {
  var i = 0;
  var call = [ testStopThread, testNullScript, testOffEvent, testOffEvent2, all_success ];
  donext();

  function donext() {
    var c = call[i++];
    if (c) {
      var tid = setTimeout(function() {
        console.error('\n!! Bad do', c.name, '(...)');
        process.exit(1);
      }, 1500);

      console.log('\n\n============== Start:', c.name);
      c(function() {
        clearTimeout(tid);
        donext();
      });
    } else {
      _over && _over();
    }
  }
}


function all_success(next) {
  console.log('All Success EXIT !!');
  next();
}


function testStopThread(next) {
  var th = thlib.create(code, '1.js');
  th.stop();

  th.on('error', function(msg) {
    console.log('success: send data after stop, get:', msg);
    next();
  });

  th.on('end', function() {
    th.send("notesend", "!");
  });
}


function testNullScript(next) {
  var th = thlib.create(code, '2.js', thlib.default_lib);

  th.on('error', function(msg) {
    console.log('success: send data after stop, get:', msg);
    next();
  });

  th.on('end', function() {
    console.log('success: no event listener, stop thread');
    th.send("notesend", "!");
  });
}


function testOffEvent(next) {
  var th = thlib.create(code2, fname, thlib.default_lib);

  th.on('end', function() {
    console.log('success: when remove all listener, stopd');
    next();
  });

  th.on('error', function(e) {
    console.error(e);
  });

  th.send('remove_all', '!');
}


function testOffEvent2(next) {
  var th = thlib.create(code2, fname, thlib.default_lib);
  var success;

  var tid = setTimeout(function() {
    success = true;
    console.log('success: remove some listener not all, always running');
    th.stop();
    next();
  }, 1000);

  th.on('end', function() {
    clearTimeout(tid);
    if (!success) {
      console.error('bad: has event listener but stopd');
    }
  });

  th.on('error', function(e) {
    console.error(e);
  });

  th.send('remove_some', '!');
}
