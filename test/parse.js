var parse = require('../lib/parse.js');
var fs = require('fs');
var code = fs.readFileSync(__dirname + '/../lib/thread-warp.js', 'utf8');

var r = parse(code, {
  context: 'a',
  events: 'b',
  fnProxy : 'c',
});
r.set('LIB_SCRIPT', 'xxxxx');
r.set('USE_SCRIPT', 'xxxfjdklsafjlsafsaxx');
console.log(r.code());
