//  这是个脚本模板, 用户脚本将被包装, 以实现功能

//
// c++ export to use script
//
var thread, id = 0;

//
// exports 用来假装有这个变量, 但是始终为 null,
// 以兼容 nodejs 的变量检测, 可以对命名进行覆盖
//
var exports;

//
// 模板变量将被替换
//
${context}
${events}
${fnProxy}

//
// thread_context 是 c++ 导出的对象, 不可暴露给用户脚本
// 2016 第一行代码, 函数返回后, 将导出库绑定在 thread 上
// c++: do_script(void *arg) -> j_context
//
(function(thread_context) {

var event = new EventEmitter();

//
// thread_context 包装为 thread 导出给用户脚本
//
thread = wrap_context(thread_context, event);


// 保护 globe -> this 不被用户代码访问
})(this);


//
// __createFunctionProxy([main function name], [args len], [has call back])
//
${LIB_SCRIPT}


// User Script is warp in `Function`
try {
  (function(thread, console) {
    // 对上层方法进行遮挡
    // 脚本中的 this 是 thread 上下文
    // thread.eval 是未定义的
    var eval, id;

    // USER_SCRIPT_BEGIN
    ${USE_SCRIPT}

  }).call(thread, thread, thread.console)
} catch(err) {
  thread.send('error', { name: err.name,
      stack: err.stack, message: err.message });
}
