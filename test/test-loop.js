describe('Dead Loop', function() {

var fs        = require('fs');
var thlib     = require('../');
var deferred  = require('deferred');
var fname     = __dirname + '/thread-loop.js';
var code      = fs.readFileSync(fname, 'utf8');
var _wait     = 2000;


var th = thlib.create(code, fname, thlib.default_lib);

it('start loop', function() {
  th.send('loop');
});


it('wait:' + _wait + 'ms and stop()', function() {
  setTimeout(function() {
    th.stop();
  }, _wait);
});


var ret = deferred();
th.on('error', function(e) {
  ret.reject(e);
});
th.on('end', function() {
  ret.resolve();
});

it('dead thread stoped', function(done) {
  this.timeout(_wait * 1.5);
  ret.promise(done, done);
});


});
