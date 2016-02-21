#ifndef JS_SERIALIZE_H
#define JS_SERIALIZE_H

#include "tools.h"

using namespace v8;


class JData {
public:
  virtual ~JData() {}
  virtual Local<Value> restore(Isolate *iso, const Local<Context> &context) = 0;
  virtual void set(Isolate *iso, const Local<Context> &context, const Local<Value> &jd) = 0;
};


struct Serialized {
private:
  JData *root;

public:
  Serialized() : root(0) {}

  ~Serialized() {
    if (root) {
      delete root;
      root = 0;
    }
  }

  void set(JData *d) {
    if (root) {
      delete root;
    }
    root = d;
  }

  JData& get() const {
    return *root;
  }
};


//
// 将 jsobj 保存到 ser 中
//
void js_save(Isolate *, const Local<Context> &, Serialized *, const Local<Value> &);


//
// 将 ser 中的数据转换为 v8 数据并返回
//
Local<Value> js_load(Isolate *iso, Local<Context> &context, Serialized *ser);


//
// Function(obj) : return obj copy
//
void j_test_ser(const FunctionCallbackInfo<Value>& args);


#endif // JS_SERIALIZE_H
