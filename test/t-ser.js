//
// 使用 node 启动, 运行压力测试
// 使用 mocha 启动, 运行测试
//
var thlib   = require('../');
var native  = require('bindings')('threadnv');
var assert  = require('assert');

var not_copy = {
  g: new String('abc'),
  e: function() {console.log('no')},
  f: new Date(),
  h: /abc/g,
  i: new Number(12),
  j: Boolean(true),
  cicle: null,
  arr: [],
};

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
  big : [],
  deep: {
    c: {
      a:1, b:2, c:3,
      s:[{
        d:"abcdffffffffffffffffffffffffffffffffffffffffffffffe",
        d1:"abcdffffffffffffffffffffffffffffffffffffffffffffffe",
        d2:"abcdffffffffffffffffffffffffffffffffffffffffffffffe",
      }]
    }
  },
};

for (var i=0; i<1000; ++i) {
  data.big.push(i);
}

// 循环引用检测 !(未实现)
// not_copy.cicle = not_copy;


try {
  describe.call;
  one();
} catch(e) {
  console.log('开始压力测试');
  mem();
}


function one() {
  describe('native serialize', function() {
    it('#ser_test()', function() {
      var ret = native.ser_test(data);
      assert.deepEqual(ret, data);
    });

    it('copy fail', function() {
      var ret = native.ser_test(not_copy);
      assert.notDeepEqual(ret, not_copy);
    });
  });
}


function mem() {
  var c = 1000;
  console.log('\n>> Test C++ Serialize');
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
