var fs = require('fs');
var thlib = require('../');
var fname = __dirname + '/thread-http.js';
var code = fs.readFileSync(fname, 'utf8');


module.exports.do = function(_over) {
  var th = thlib.create(code, fname, thlib.default_lib);
  console.log('\n============== Start: thread function');

  th.on('error', function(e) {
    console.log('Thread error:', '\n\t', e.message, '\n\t', e.stack);
  });

  th.on('end', function() {
    console.log('success: thread function stop');
    _over && _over();
  });

  th.on('over', function() {
    th.send('ok');
  })
};
