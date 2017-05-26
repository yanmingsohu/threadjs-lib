var thlib = require('../');
var repl  = require('repl');

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
  var ret = thread.eval(code); \
  thread.send('ret', ret); \
} \
";


var lib = thlib.default_lib;
var h = thlib.create(subcode, 'cli-console-sub-thread', lib);
var callback_queue = [];


h.on('end', function() {
  console.log('exit');
  process.exit();
});

h.on('error', function(err) {
  cmd_ret(err);
});

h.on('ret', function(ret) {
  cmd_ret(null, ret);
});

function cmd_ret(err, ret) {
  var cb = callback_queue.shift();
  if (cb) {
    cb(err, ret);
  } else {
    console.log(err || ret);
  }
}


console.log('[ JavaScript command on Thread ]');
var replServer = repl.start({
  prompt: '> ',
  eval: myEval,
});

replServer.on('exit', function() {
  h.stop();
});


function myEval(cmd, context, filename, callback) {
  callback_queue.push(callback);
  recvCommand(cmd);
}


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
