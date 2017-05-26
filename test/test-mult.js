describe('Multiple Threads', function() {

var deferred  = require('deferred');
var fs        = require('fs');
var thlib     = require('../');
var assert    = require('assert');
var fname     = __dirname + '/thread-mult.js';
var code      = fs.readFileSync(fname, 'utf8');

var threadcount = 10;
var messagecount = 3;


var check_data = {};


for (var i=0; i<threadcount; ++i) {
  describe('Thread ' + i, function() {
    newThread(i);
  });
}

after(function() {
  var max=0, min=0, c=0, total=0;

  for (var id in check_data) {
    var use = check_data[id].use;
    for (var n in use) {
      var i = use[n];
      max = Math.max(max, i);
      min = Math.min(min, i);
      ++c;
      total += i;
    }
  }

  console.log('\tUse:', mem_use(), ', Event Time Max:', max,
    'ms, Min:', min, 'ms, Average:', (total/c).toFixed(2),
    'ms, Total', c, 'events.');
});



//
// 创建线程, 发送消息, 关闭线程
//
function newThread(i) {
  var th = thlib.create(code, fname, thlib.default_lib);
  var xs = 0, xa = 0;
  var start;
  var ck = check_data[i] = { recv:{}, send:{}, use:{}, threadId: th.threadId };
  // log('start new thread', i, mem_use());

  th.on('submessage', function(data) {
    // log('!!! main is recive:', data, "\t", mem_use());
    ck.use[data.msg_id] = Date.now() - data.start;
    ck.recv[data.msg_id] = data;

    if (data.msg_id >= messagecount*2-1) {
      th.stop();
    }
  });

  var ret = deferred();
  th.on('end', function() {
    try {
      assert.deepEqual(ck.recv, ck.send);
      ret.resolve();
    } catch(e) {
      ret.reject(e);
    }
  });

  th.on('error', function(e) {
    ret.reject(e);
  });

  it('start', function() {
    start = Date.now();
  });

  // return;
  it('send data to thread with sync', sendNotAsync);
  it('send data to thread with async', sendInAsync);

  it('check results', function(done) {
    ret.promise(done, done);
  });


  function sendNotAsync() {
    while (xs < messagecount) {
      _send('s', xs);
      ++xs;
    }
    // log('Sync thread over', i, 'use', (Date.now() - start)/1000, 'm');
  }

  function sendInAsync() {
    var tid = setInterval(function() {
      _send('a', xa);
      ++xa;
      if (xa >= messagecount) {
        clearInterval(tid);
        // log('Async thread over', i, 'use', (Date.now() - start)/1000, 'm');
        // th.stop();
      }
    }, 1);
  }

  function _send(t, x) {
    var id = xa+xs;
    // th.send('mainmessage', t+'.main=\t' + i + "\t" + x);
    var s = ck.send[id] = {
      t_id    : th.threadId,
      start   : Date.now(),
      msg_id  : xa+xs,
    };
    th.send('mainmessage', s);
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

});
