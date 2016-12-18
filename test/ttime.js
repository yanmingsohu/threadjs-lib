var thlib = require('../');

var code = "\
var stop = false; \
function a() { \
  stop || setTimeout(a, 1);\
  thread.send('c');\
}\
var tid = setInterval(function() { thread.send('c'); }, 1);\
thread.on('stop', function() {\
  stop = true;\
  clearInterval(tid);\
  thread.off('start');\
  thread.off('stop');\
});\
thread.on('start', function() {\
  stop = false;\
  a();\
});\
";

var mbyte = 1024*1024;
var total = 200;
var running = total;

//
// 测试内存泄漏
//
function thread() {
  var c = 0;
  var th = thlib.create(code, 'loop timeout');
  var show = th.threadId * 1000;

  th.on('error', function(e) {
    console.log('fail:', e);
  });

  th.on("end", function() {
    console.log('STOP:', th.threadId);
    --running;
  });

  th.on('c', function() {
    if (++c % show == 0) {
      console.log("DO:", th.threadId, c);
      th.send('stop');
    }
  });
}


// 200  线程, 1G
// 1000 线程, 5G
for (var i=0; i<total; ++i) {
  thread();
}


var tid = setInterval(function() {
  var mm = process.memoryUsage().rss / mbyte;
  console.log('\t', mm, 'Mbyte', mm / running, 'MB/thread');
  if (running <= 0) {
    clearInterval(tid);
  }
}, 5000);
