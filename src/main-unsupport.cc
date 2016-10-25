#include <node.h>
#include <stdio.h>
#include <iostream>
#include <node_version.h>

using namespace v8;
using namespace std;


// template<typename A, typename R>
// R j_unsupport(const A args) {
// 	throw "unsupport native implements";
// }

void init(Handle<Object> exports) {
  // NODE_SET_METHOD(exports, "monitoring", j_unsupport);
  char *msg = "can not support this node version: " NODE_VERSION_STRING;
  std::cout << msg << endl;
  Isolate* isolate = Isolate::GetCurrent();
  Local<String> errmsg = String::NewFromUtf8(isolate, msg);
  isolate->ThrowException(v8::Exception::Error(errmsg));
}


NODE_MODULE(fc_notify, init)
