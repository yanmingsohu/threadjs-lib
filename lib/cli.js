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
function oncode(d) { \
  try { \
    var ret = thread.eval(d.code); \
    thread.send(d.ret, ret); \
  } catch(e) { \
    thread.send(d.ret, e.stack); \
  } \
} \
";


var id = 0;
var lib = thlib.default_lib;
var h = thlib.create(subcode, 'cli-console-sub-thread', lib);


h.on('end', function() {
  console.log('exit');
  process.exit();
});

h.on('error', function(err) {
  console.log('ERROR$', err);
});

console.log('[ JavaScript command on Thread ]');
var replServer = repl.start({
  prompt: '> ',
  eval: myEval,
});

replServer.on('exit', function() {
  h.stop();
});


function myEval(cmd, context, filename, callback) {
  var ret = 'ret_' + (++id);

  h.send('code', {
    code : cmd.toString().trim(),
    ret  : ret,
  });
  h.once(ret, function(r) {
    callback(r);
  });
}


process.on('uncaughtException', function(err) {
  console.log('uncaughtException', err);
});
