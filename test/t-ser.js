var thlib = require('../');
var native = require('bindings')('threadnv');
console.log("V8:", native.v8version());


var data = {
  '0':null,
  '1':null,
  '1.1': null,
  '0': '001',
  a:1,
  b:[1,2,3],
  c:{
    arr:[1,2],
  },
  d:"abcdffffffffffffffffffffffffffffffffffffffffffffffe",
  d1:"abcdffffffffffffffffffffffffffffffffffffffffffffffe",
  d2:"abcdffffffffffffffffffffffffffffffffffffffffffffffe",
  e: function() {console.log('no')},
  f: new Date(),
  g: new String('abc'),
  h: /abc/g,
  i: new Number(12),
  j: Boolean(true),
  cicle: null,
  arr: [],

  deep: {
    c: {
      a:1, b:2, c:3,
      s:[{
        d:"abcdffffffffffffffffffffffffffffffffffffffffffffffe",
        d1:"abcdffffffffffffffffffffffffffffffffffffffffffffffe",
        d2:"abcdffffffffffffffffffffffffffffffffffffffffffffffe",
      }]
    }
  }
};

// 循环引用检测 !
// data.cicle = data;

// Big data
// for (var i=0; i<10000; ++i) {
//   data.arr.push(i);
// }

one();
mem();


function one() {
  var ret = native.ser_test(data);

  console.log('\n原始 >>>>>>>>>>>>');
  console.log(data);
  console.log('\n变换 ============');
  console.log(ret);
  console.log('\nJSON ++++++++++++');
  console.log(JSON.parse(JSON.stringify(data)));
}


function mem() {
  var c = 10000;
  console.log('\n>> Test Native');
  var start = Date.now();
  for (var i=0; i<c*5; ++i) {
    var ret = native.ser_test(data);

    if (i % c == 0) {
      printInfo();
    }
  }

  console.log('\n>> Test JSON');
  start = Date.now();
  for (var i=0; i<c*5; ++i) {
    var ret = JSON.parse(JSON.stringify(data));

    if (i % c == 0) {
      printInfo();
    }
  }

  function printInfo() {
    console.log(mem_use(), '\t-', i, '\t-', (Date.now() - start) / i, 'ms');
  }
}


function mem_use() {
  var use = process.memoryUsage().rss;
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
  return use.toFixed(0) + ' ' + unit;
}
