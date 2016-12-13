//  前置代码在 main-warp.js 中定义

//
// c++ export to use script
//
var thread, id = 0;

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

/*
__createFunctionProxy([main function name], [args len], [has call back])
*/

/*
// User Script is warp in `Function`
(function(thread,  ...) {
  var _stop, _recv, _send;
  ..... User Script here .....
}).call(thread, thread ...);
*/
