#include "tools.h"
#include "data.h"


void when_handle_closed_cb(uv_handle_t* handle) {
  delete handle;
}


void donothing_closed_cb(uv_handle_t* handle) {
  // nothing
}


//
// CACHE_V8_ERR_SEND_EVNET() 放在头文件里调用会无法编译
//
void SaveCallFunction::call() {
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
