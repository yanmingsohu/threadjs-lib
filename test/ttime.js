try { it; return; } catch(e) {}


console.log('\
内存压力测试, 该脚本直接使用 node 运行, 跳过 mocha 测试 \
\n每个线程使用定时器发送 n 条消息后结束, 线程数量~=线程id*1000 \
\n线程在接受到停止消息前使用异步发送消息, 不保证停止后发送消息的准确数量. \
\n\n[ctrl + c] 停止测试. \
\n');


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
  thread.offall();\
});\
thread.on('start', function() {\
  stop = false;\
  a();\
});\
";

var mbyte = 1024*1024;
var total = 200; // 线程数量
var event_count = 1000; // 每线程发送消息数量
var running = total;
var thlib = require('../');

//
// 测试内存泄漏
//
function thread(num) {
  var c     = 0;
  var th    = thlib.create(code, 'loop timeout');
  var show  = num * event_count;
  var begin = Date.now();

  th.on('error', function(e) {
    console.log('fail:', e);
  });

  th.on("end", function() {
    var use = Date.now() - begin;
    console.log('线程停止:', num, '发送了', c, '条消息, 耗时', time(use),
      ', 每条消息使用', (use/c).toFixed(2), 'ms');
    --running;
    th.offall();
  });

  th.on('c', function() {
    if (++c == show) {
      th.send('stop');
    }
  });
}

var how = event_count * (total/2) * (total+1);
// 200  线程, 1G
// 1000 线程, 5G
console.log('启动', total, '个线程, 预计发送', how, '条消息.');
for (var i=0; i<=total; ++i) {
  thread(i);
}


var tid = setInterval(function() {
  var mm = process.memoryUsage().rss / mbyte;
  console.log(
      '\t使用了内存', mm.toFixed(2), 'Mbyte',
      (mm / running).toFixed(2), 'MB/线程',
      '有', running, '个线程正在运行');

  if (running <= 0) {
    clearInterval(tid);
    process.exit();
  }
}, 5000);


function time(s) {
  var u = '毫秒';
  if (s > 1000) {
    s /= 1000;
    u = '秒';
    if (s > 60) {
      s /= 60;
      u = '分';
    }
  }
  return s.toFixed(2) + u;
}
