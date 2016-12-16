var thlib = require('../');

var code = "\
var stop = false; \
function a() { \
  stop || setTimeout(a, 1);\
  thread.send('c');\
}\
var tid = setInterval(function() { thread.send('c'); }, 1);\
thread.on('gotend', function() {\
  thread.off('gotend');\
  thread.off('start');\
  thread.off('stop');\
});\
thread.on('stop', function() {\
  stop = true;\
  clearInterval(tid);\
});\
thread.on('start', function() {\
  stop = false;\
  a();\
});\
";

var total = 200;

//
// 测试内存泄漏
//
function thread() {
  var c = 0;
  var th = thlib.create(code, 'loop timeout');
  var show = th.threadId * 1000;
  var mbyte = 1024*1024;

  th.on('error', function(e) {
    console.log('fail:', e);
  });

  th.on("end", function() {
    console.log('end');
  });

  th.on('c', function() {
    if (++c % show == 0) {
      var mm = process.memoryUsage().rss/mbyte
      console.log(th.threadId, c, mm, 'Mbyte', mm/total, 'MB/thread');
      th.send('gotend');
    }
  });
}


// 200  线程, 1G
// 1000 线程, 5G
for (var i=0; i<total; ++i) {
  thread();
}
