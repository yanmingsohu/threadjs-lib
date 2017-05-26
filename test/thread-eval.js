try { it; return; } catch(e) {}

// 运行这个代码, 进程崩溃
// npm ERR! code ELIFECYCLE
// npm ERR! Exit status 3221225477
// thread.eval('function() {}', 'shutdown');

var context = thread.create_context();
context.thread = 'haha';
context.a = 1;

thread.send('e2', thread.eval('this', 'test.js', 0, context));

// console.log('thread.eval(1+1) =', thread.eval('1+1'));
thread.send('e1', thread.eval('1+1'));

// 最后执行该方法抛出异常
thread.eval('not_exists +1', 'thread-wait.js', 0);
