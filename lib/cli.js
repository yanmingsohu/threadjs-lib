var thlib = require('../');

//
// 子线程代码
// 接收主线程发来的代码并执行把结果发回去
//
// 测试在 uv 任务中挂载事件而不会退出:
// setTimeout(function() { thread.on('code', oncode) }, 2000);
//   thread.off('code');
//
var subcode = " \
thread.on('code', oncode); \
function oncode(code) { \
  var ret = eval(code); \
  if (typeof ret == 'function') { \
    ret = ret + ''; \
  } \
  else if (typeof ret == 'object') { \
    ret = JSON.stringify(ret, null, 2); \
  } \
  thread.send('ret', ret + ''); \
} \
";


var lib = thlib.default_lib;
var h = thlib.create(subcode, 'cli-console-sub-thread', lib);


h.on('end', function() {
  console.log('exit');
  // 顺序不能错 pause->remove
  process.stdin.pause();
  process.stdin.removeAllListeners();
});

h.on('error', function(err) {
  console.error('fail:', err);
});

h.on('ret', function(ret) {
  console.log(ret);
});


console.log('[ JavaScript command ]');
process.stdin.on('data', recvCommand);


function recvCommand(cmd) {
  h.send('code', cmd.toString().trim());
}


function print(a) {
  if (a) process.stdout.write('' + a);
  for (var i=1, e=arguments.length; i<e; ++i) {
    process.stdout.write(' ' + arguments[i]);
  }
}

process.on('uncaughtException', function(err) {
  console.log('uncaughtException', err);
});
