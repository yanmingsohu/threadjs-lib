var thlib = require('../');
var fs = require('fs');

var fname = __dirname + '/thread2.js';
var code2 = fs.readFileSync(fname, 'utf8');

var th = [];
var count = 1000;

for (var i=0; i<count+1; ++i) {
  thlib.create(code2, fname, thlib.default_lib);
  if (i % (count/10) == 0) {
    mem_use(i);
  }
}

function mem_use(th_count) {
  var use = process.memoryUsage().rss;
  var puse = use/th_count;
  
  function punit(use) {
    var unit = 'byte';
    if (use > 1024) {
      use /= 1024;
      unit = 'Kbyte';
      if (use > 1024) {
        use /= 1024;
        unit = 'Mbyte';
        if (use > 1024) {
          use /= 1024;
          unit = 'Gbyte';
        }
      }
    }
    return use.toFixed(2) + unit;
  }

  console.log('thread:', th_count, '::', punit(use), ';', punit(puse), '/1thread');
}
