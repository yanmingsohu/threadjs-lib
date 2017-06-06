try { it; return; } catch(e) {}


var thlib = require('threadjs-lib');
var code = function fi() {
  var a=0, b=1, c=1;
  for (var i=0; i<100; ++i) {
    console.log(i, '\t', c);
    c = a + b;
    a = b;
    b = c;
  }
}.toString() + '; fi();';
var handle = thlib.create(code, 'test', thlib.default_lib);
handle.on('end', function() {
  console.log('thread exited');
});


var thlib = require('threadjs-lib');
var code = function _node() {
  console.log(process.versions);
}.toString() + '; _node();';
var handle = thlib.create_node(code, 'node');
handle.on('end', function() {
  console.log('thread exited');
});
