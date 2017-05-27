try { it; return; } catch(e) {}



var context = thread.create_context();
context.thread = 'haha';
context.a = 1;

// console.log('thread.eval(1+1) =', thread.eval('1+1'));
thread.send('e1', thread.eval('1+1'));


thread.on('eval', function(code) {
  try {
    // console.log(1, code)
    var ret = thread.eval(code, '[test]', 0, context);
    thread.send('eval', [null, ret]);
  } catch(e) {
    thread.send('eval', [e.stack]);
  }
});



// ! 最后执行该方法抛出异常 !----------------------->
thread.eval('not_exists +1', 'thread-wait.js', 0);
// END ------------------------------------------->
