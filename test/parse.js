var parse = require('../').code_template;
var fs = require('fs');
var code = fs.readFileSync(__dirname + '/../lib/thread-warp.js', 'utf8');

var r = parse(code, {
  context : '"wrap_context"',
  events  : '"EventEmitter"',
  fnProxy : '"__createFunctionProxy"',
});
r.set('LIB_SCRIPT', '__createFunctionProxy(.....)');
r.set('USE_SCRIPT', '1+1');
console.log(r.code());
