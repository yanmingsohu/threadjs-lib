//  这是个脚本模板, 用户脚本将被包装, 以实现功能

//
// c++ export to use script
//
var thread;

//
// global.thread_context 是 c++ 导出的对象, 不可暴露给用户脚本
// 2016 第一行代码, 函数返回后, 将导出库绑定在 thread 上
// c++: do_script(void *arg) -> j_context
//
(function(global) {

//
// exports 用来假装有这个变量, 但是始终为 null,
// 以兼容 nodejs 的变量检测, 可以对命名进行覆盖
//
var exports;

//
// 模板变量将被替换
// wrap_context
// EventEmitter
// __createFunctionProxy
//
${fnProxy}
${context}
${events}

var event = new EventEmitter();
var thread_context = global.thread_context;

//
// thread_context 包装为 thread 导出给用户脚本
//
thread = wrap_context(thread_context, event);

//
// 删除 thread_context 之后 global 即全局变量是安全的可以给用户使用
//
delete global.thread_context;
global.EventEmitter = EventEmitter;

//
// __createFunctionProxy([main function name], [args len], [has call back])
//
${LIB_SCRIPT}

})(this);


// User Script is warp in `Function`
try {
  (function(thread, console) {
    //
    // 用户代码在这里可以安全引用所有的变量
    //
    // 下一行注释作为用户代码标志不可以移除, 且必须只能出现一次
    // 脚本一旦出错会打印堆栈, 其中标明出错行时将使用这个偏移,
    // 不可以间隔空行.
    // ! USER_SCRIPT_BEGIN !
    ${USE_SCRIPT}

  }).call(this, thread, thread.console)
} catch(e) {
  // JSON 没法正确序列化 Error 对象
  thread.send('error', {
    name    : e.name,
    stack   : e.stack,
    message : e.message,
  });
}
