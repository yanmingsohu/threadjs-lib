var fs = require('fs');
var thlib = require('../');
var fname = __dirname + '/thread-wait.js';
var code = fs.readFileSync(fname, 'utf8');


module.exports.do = function(_over) {
  var th = thlib.create(code, fname, thlib.default_lib);
  console.log('\n============== Start: wait function');

  th.on('_thread_locked', function() {
    console.log('main thread is wait... 3s');
    setTimeout(function() {
      console.log('main notify sub to wake up');
      th.notify('go go go');
    }, 3000);
  });

  th.on('error', function(e) {
    console.log('err:', e);
  });

  th.on('end', function() {
    console.log('success');
    _over && _over();
  });
};
