#include "tools.h"
#include "data.h"


void free_when_handle_closed_cb(uv_handle_t* handle) {
  delete handle;
}


void donothing_closed_cb(uv_handle_t* handle) {
  // nothing
}


char* get_uv_type(uv_handle_t* handle) {
#define T(name)   case name: return #name;
  switch (handle->type) {
    T(UV_TCP)       T(UV_NAMED_PIPE)  T(UV_TTY)
    T(UV_UDP)       T(UV_POLL)        T(UV_TIMER)
    T(UV_PREPARE)   T(UV_CHECK)       T(UV_IDLE)
    T(UV_ASYNC)     T(UV_SIGNAL)      T(UV_PROCESS)
    T(UV_FS_EVENT)  T(UV_FS_POLL)
  }
  return "!-UNKNOW";
#undef T
}


//
// 在删除 uv_handle_t 之前, 如果 data 绑定了其他对象, 必须首先被释放.
//
void walk_free_uv_handle(uv_handle_t* handle, void* loop) {
  if (uv_is_closing(handle))
    return;

  //
  // uv_close 将导致重复删除 node::Env 中的句柄, 并且无法判断
  // 这些句柄是 ENV 中的还是其他.
  // 若掉用 uv_close 关闭(不删除) node::Env 中的句柄 会引发崩溃:
  // Assertion failed: 0, file src\win\handle.c, line 71
  //
  printf("Cannot call \"walk_free_uv_handle\" process while abort");
  assert(false);

  uv_close(handle, donothing_closed_cb);
}


//
// ! 该方法不能使用
//
void free_event_loop_resource(uv_loop_t *&loop) {
  uv_walk(loop, walk_free_uv_handle, loop);
  uv_run(loop, UV_RUN_DEFAULT);
  DEL_LOOP(loop);
}


//
// CACHE_V8_ERR_SEND_EVNET() 放在头文件里调用会无法编译
//
void SaveCallFunction::call() {
  HandleScope handle_scope(iso);
  Local<Function> f = Nan::New(fn);
  Local<Object>   c = Nan::New(co);

  TryCatch jtry;
  f->Call(c, 0, 0);

  if (target) {
    CACHE_V8_ERR_SEND_EVNET(iso, target, jtry, "Uncaught");
  }
  else if (jtry.HasCaught()) {
    String::Utf8Value stack(jtry.StackTrace());
    std::cout << "> SaveCallFunction::call() Uncaught "
        << __FILE__ << " at " << __LINE__ << std::endl
        << "> " << *stack << std::endl;
  }
}
