#include <node.h>
#include <stdio.h>

using namespace v8;


// template<typename A, typename R>
// R j_unsupport(const A args) {
// 	throw "unsupport native implements";
// }

void init(Handle<Object> exports) {
  // NODE_SET_METHOD(exports, "monitoring", j_unsupport);
  char *msg = "can not support this node version.";
  cout << msg << endl;
  Isolate* isolate = Isolate::GetCurrent();
  Local<String> errmsg = String::NewFromUtf8(isolate, msg);
  isolate->ThrowException(v8::Exception::Error(errmsg));
}


NODE_MODULE(fc_notify, init)
