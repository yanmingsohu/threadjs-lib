describe('nodejs native module exports', function() {

var fs        = require('fs');
var thlib     = require('../');
var deferred  = require('deferred');
var assert    = require('assert');

var fname     = __dirname + '/thread-native.js';
var code      = fs.readFileSync(fname, 'utf8');


var th = thlib.create(code, fname, thlib.default_lib);
var result = deferred();


th.on('error', function(e) {
  console.log('!!', e);
  result.reject(e);
});


th.on('ready', function() {
  result.resolve();
});
it('ready', function(done) {
  result.promise(done, done);
});


it('fs.readFile() on thread', function(done) {
  var af = deferred();
  th.once('file-ret', function(str) {
    try {
      assert.deepEqual(str, code);
      af.resolve();
    } catch(e) {
      af.reject(e);
    }
  });
  th.send('readfile', fname);
  af.promise(done, done);
});


it('http.get() on thread', function(done) {
  var url = 'http://www.sogou.com/';
  var af = deferred();
  var http = require('http');

  th.once('http-ret', function(buf) {
    try {
      console.log(buf)
      af.resolve();
    } catch(e) {
      af.reject(e);
    }
  });
  th.once('error', function(e) {
    af.reject(e);
  });

  th.send('http-get', url);
  af.promise(done, done);
});


});
