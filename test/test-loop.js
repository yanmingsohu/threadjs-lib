var fs = require('fs');
var thlib = require('../');
var fname = __dirname + '/thread-loop.js';
var code = fs.readFileSync(fname, 'utf8');


module.exports.do = function(_over) {
  var th = thlib.create(code, fname, thlib.default_lib);
  console.log('\n============== Start: loop thread', th.threadId);

  th.on('error', function(e) {
    console.error('error', e);
  });

  th.on('end', function() {
    console.log('success: loop thread stop');
    _over && _over();
  });

  th.send('loop');

  setTimeout(function() {
    console.log('loop use time:', th.use_time(), 'ms');
    th.stop();
    console.log('stop called');
  }, 1000);
};
