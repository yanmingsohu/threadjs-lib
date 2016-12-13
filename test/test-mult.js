var fs = require('fs');
var thlib = require('../');
var fname = __dirname + '/thread-mult.js';
var code = fs.readFileSync(fname, 'utf8');
var threadcount = 10;
var messagecount = 3;


var check_data = {};


module.exports.do = function(_over) {
  log('\n============== Start: mult thread', threadcount);
  process.on('beforeExit', beforeExit);
  newThread(0);

  //
  // 正确/错误/所有情况下都应该结束进行, 否则是 c++ 进程管理有问题
  //
  function beforeExit() {
    process.removeListener('beforeExit', beforeExit);
    log('All Thread exit');
    var wrong = [];
    var time = [];
    var saved = {};

    for (var ti=0; ti < threadcount; ++ti) {
      var th = check_data[ti];

      if (!th) {
        push('thread not start tid: ', th.threadId);
      } else {
        for (var mi=1; mi<= messagecount; ++mi) {
          // console.log(ti, mi, th);
          if (!xCompare(th.send[mi], th.recv[mi]) ) {
            push('data wrong tid: ',  th.threadId);
          } else {
            var r = th.recv[mi];
            // 算入启动线程的时间
            time.push('Th:' + th.threadId + ' msg:' + mi + '\t' + (r.end-r.start) + ' ms');
          }
        }
      }
    }

    function push(msg, id) {
      if (saved[id]) return;
      saved[id] = true;
      wrong.push(msg + id);
    }

    if (wrong.length > 0) {
      log(check_data);
      log('\n[has error]:\n\t', wrong.join("\n\t"));
    } else {
      log('\n[thread transfer data use]\n\t', time.join("\n\t"));
      log('[All success]');
    }

    if (_over) {
      _over();
    } else {
      process.exit(0);
    }
  }
}


function xCompare(s, r) {
  return s && r && s.main_id == r.sub_id && s.msg_id == r.msg_id;
}


function log() {
  console.log.apply(console, arguments);
}


//
// 创建线程, 发送消息, 关闭线程
//
function newThread(i) {
  var th = thlib.create(code, fname, thlib.default_lib);
  var x = 0;
  var start = Date.now();
  var ck = check_data[i] = { recv:{}, send:{}, threadId: th.threadId };
  // log('start new thread', i, mem_use());

  th.on('submessage', function(data) {
    // log('!!! main is recive:', data, "\t", mem_use());
    data.end = Date.now();
    ck.recv[data.msg_id] = data;
    if (data.msg_id >= messagecount) {
      th.stop();
    }
  });

  th.on('end', function() {
    ck.stop = true;
  });

  th.on('error', function(e) {
    ck.error = e;
  });

  if (i<threadcount) {
    setTimeout(function() {
      newThread(i+1);
    }, 10);
  }

  // return;
  sendNotAsync();
  sendInAsync();


  function sendNotAsync() {
    while (++x < messagecount) {
      _send('s');
    }
    // log('Sync thread over', i, 'use', (Date.now() - start)/1000, 'm');
  }

  function sendInAsync() {
    var tid = setInterval(function() {
      _send('a');
      if (++x >= messagecount) {
        clearInterval(tid);
        // log('Async thread over', i, 'use', (Date.now() - start)/1000, 'm');
        // th.stop();
      }
    }, 1);
  }

  function _send(t) {
    // th.send('mainmessage', t+'.main=\t' + i + "\t" + x);
    var s = ck.send[x] = {
      main_id : th.threadId,
      sub_id  : null,
      start   : start,
      msg_id  : x,
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
