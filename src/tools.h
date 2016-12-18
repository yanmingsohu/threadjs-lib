#ifndef THREAD_TOOLS_H
#define THREAD_TOOLS_H


#include <node.h>
#include <v8.h>
#include <uv.h>
#include <iostream>
#include <sstream>
#include <string>
#include <set>
#include <cstdlib>

using namespace v8;
using namespace node;
using namespace std;

struct RecvEventData;


#define V8_CHAR(iso, str) \
  String::NewFromUtf8(iso, str)


// 删除 uv_async_t 句柄, 且绑定的数据为 RecvEventData
#define DEL_UV_HANDLE_RECV_EVENT(h) \
  if (h) { \
    if (h->data) { \
      RecvEventData* red = (RecvEventData*) h->data; \
      delete red; \
      h->data = 0; \
    } \
    uv_close((uv_handle_t*) h, when_handle_closed_cb); \
    h = 0; \
  }


// 只删除 uv_async_t 句柄, 且句柄中 data 为空
#define DEL_UV_ASYNC(h) \
  if (h) { \
    uv_close((uv_handle_t*) h, when_handle_closed_cb); \
    h = 0; \
  }


#define DEL_ARRAY(h) \
  if (h) { \
    delete [] h; \
    h = 0; \
  }


#define DEL_LOOP(h) \
  if (h) { \
    uv_stop(h); \
    uv_loop_close(h); \
    delete h; \
    h = 0; \
  }


// FCI: FunctionCallbackInfo
#define INIT_ISOLATE_FCI(iso, fci) \
  Isolate *iso = fci.GetIsolate(); \
  HandleScope scope(iso);


#define RET_OBJ_FUNCTION_INIT(iso, args, thiz) \
  INIT_ISOLATE_FCI(iso, args); \
  Local<Object> thiz = args.This(); \
  if (id_pool.notfree(iso, thiz)) \


// FCI: FunctionCallbackInfo
#define GET_FCI_EXTERNAL_ATTR(fci, tmp, TYPE, pvar) \
  Local<External> tmp = fci.Data().As<External>(); \
  TYPE *pvar = (TYPE*) tmp->Value() \


#define SET_BOOL_ATTR(iso, obj, attr, val) \
  obj->Set(String::NewFromUtf8(iso, attr), Boolean::New(iso, val))


#define GET_BOOL_ATTR(iso, obj, attr) \
  obj->Get(String::NewFromUtf8(iso, attr))->IsFalse()


#define CHECK_TYPE(type, iso, object, errmsg) \
{ \
  if (!object->Is##type ()) { \
    Local<String> err = String::NewFromUtf8(iso, errmsg); \
    iso->ThrowException(err); \
    return; \
  } \
}


#define CHECK_NULL(iso, object, errmsg) \
{ \
  if (object->IsNull() || object->IsUndefined()) { \
    Local<String> err = String::NewFromUtf8(iso, errmsg); \
    iso->ThrowException(err); \
    return; \
  } \
}


#define THROW_EXP(iso, errmsg) \
{ \
  Local<String> err = String::NewFromUtf8(iso, errmsg); \
  iso->ThrowException(err); \
}


#define CACHE_V8_ERR_SEND_EVNET(iso, target, jtry, error_type) \
  if (jtry.HasCaught()) { \
    String::Utf8Value exception(jtry.Exception()); \
    Local<Message> msg = jtry.Message(); \
    String::Utf8Value line(msg->GetSourceLine()); \
    Json jroot; \
    jroot.set("name", "error"); \
    Json jdata = jroot.childen("data"); \
    jdata.set("name",      error_type); \
    jdata.set("message",   *exception); \
    jdata.set("linenum",   msg->GetLineNumber()); \
    jdata.set("columnnum", msg->GetStartColumn()); \
    jdata.set("jscode",    *line); \
    jdata.end(); \
    jroot.end(); \
    RecvEventData::sendEvent(target, jroot); \
  }


#if NODE_MAJOR_VERSION == 0
  #if NODE_MINOR_VERSION == 12 or NODE_MINOR_VERSION == 13
    #define CREATE_ISOLATE(isolate) \
      Isolate *isolate = Isolate::New()
  #endif
#elif NODE_MAJOR_VERSION == 6
  #define CREATE_ISOLATE(isolate) \
    ArrayBufferAllocator allo; \
    Isolate::CreateParams parm; \
    parm.array_buffer_allocator = &allo; \
    Isolate * isolate = Isolate::New(parm); 
#endif


template<class T, class LEN>
inline void v8val_to_char(const Local<T> &v8s, char *&ch, LEN &chlen) {
  if (!v8s->IsString()) return;

  Local<String> str = Local<String>::Cast(v8s);
  int len = str->Utf8Length() + 1;
  char * code_s = new char[len];
  str->WriteUtf8(code_s, len);
  code_s[len-1] = 0;

  ch = code_s;
  chlen = len;
}


//
// 调用第一个参数是字符串的函数
//
template<class T>
void CALL_JS_OBJ_FN_STR1(Isolate* isolate, T& thiz, const char* name, const char* arg1) {
  HandleScope handle_scope(isolate);
  Local<Value> val = thiz->Get(String::NewFromUtf8(isolate, name));
  CHECK_TYPE(Function, isolate, val, "must function");
  Local<Function> func = val.As<Function>();
  Local<Value> argv[] = { String::NewFromUtf8(isolate, arg1) };
  func->Call(thiz, 1, argv);
}


//
// 调用一个函数返回 bool, 无参数
//
template<class T>
bool CALL_JS_OBJ_FN_RET_BOOL(Isolate* isolate, T& thiz, char* name) {
  HandleScope handle_scope(isolate);
  Local<Value> val = thiz->Get(String::NewFromUtf8(isolate, name));
  // CHECK_TYPE(Function, isolate, val, "must function");
  Local<Function> func = val.As<Function>();
  Local<Value> ret = func->Call(thiz, 0, 0);
  return ret->IsTrue() == true;
}


template <typename TypeName>
inline void set_method( Isolate* isolate,
                        TypeName& recv,
                        char* name,
                        FunctionCallback callback,
                        void *data = 0) {
  HandleScope handle_scope(isolate);
  Local<External> fdata = External::New(isolate, data);
  Local<FunctionTemplate> t = FunctionTemplate::New(isolate, callback, fdata);
  Local<Function> fn = t->GetFunction();
  Local<String> fn_name = String::NewFromUtf8(isolate, name);
  fn->SetName(fn_name);
  recv->Set(fn_name, fn);
}


template<class T>
inline Persistent<T>* copy(Isolate* iso, Local<T> src) {
  return new Persistent<T>(iso, src);
}


template<class T>
inline Local<T> copy(Isolate *iso, Persistent<T> *src) {
  return Local<T>::New(iso, *src);
}


void when_handle_closed_cb(uv_handle_t* handle);
void donothing_closed_cb(uv_handle_t* handle);


//
// 必须按照 JSON 的生成顺序调用 api, 否则会生成无效的 JSON
// 不要设置参数中有双引号 `"` 的字符串
//
class Json {
  std::ostringstream *buf;
  int attr_count;
  bool isroot;

  void init() {
    *buf << "{";
    attr_count = 0;
  }

  template<class K>
  inline void write_key(K& k) {
    if (attr_count > 0)
      *buf << ',';
    *buf << '"' << k << "\":";
    ++attr_count;
  }

public:
  Json() : isroot(true) {
    buf = new std::ostringstream();
    init();
  }
  Json(const Json &p) : buf(p.buf), attr_count(p.attr_count), isroot(false) {
  }
  ~Json() {
    if (isroot)
      delete buf;
  }

  // template<class DNOT_SET_JSON_OBJ>
  // void set(DNOT_SET_JSON_OBJ k, Json obj);

  template<class K>
  Json childen(K& name) {
    write_key(name);
    Json j(*this);
    j.init();
    return j;
  }

  template<class K, class V>
  void set(K k, V v) {
    write_key(k);
    *buf << '"' << v << '"';
  }

  // 闭合一个对象
  void end() {
    *buf << '}';
  }

  std::string str() {
    return buf->str();
  }
};


//
// 函数范围内安全的指针, 函数返回, 指针被删除, 不可复制
//
template<class T>
class LocalPoint {
  T *point;
public:
  LocalPoint(T *p) : point(p) {}
  ~LocalPoint() {
    if (point) {
      delete point;
      point = 0;
    }
  }
  T* operator->() {
    return point;
  }
  T* get() {
    return point;
  }
private:
  LocalPoint(LocalPoint &a);
  void operator=(LocalPoint &a);
};


template<class T>
class AutoDispose {
private:
  T *point;
  AutoDispose(const AutoDispose &a);
  void operator=(const AutoDispose &a);
public:
  AutoDispose(T *p) : point(p) {}
  ~AutoDispose() {
    if (point) {
      point->Dispose();
      point = 0;
    }
  }
};


class LockHandle {
  uv_mutex_t &data;

public:
  LockHandle(uv_mutex_t &d) : data(d) {
    uv_mutex_lock(&data);
  }

  ~LockHandle() {
    uv_mutex_unlock(&data);
  }
};


class WaitThread {
  uv_cond_t  cond;
  uv_mutex_t mutex;
  bool       locked;
  char*      data;

public:
  WaitThread() : locked(0), data(0) {
    if (uv_cond_init(&cond)) {
      throw "uv_cond_init fail";
    }
    if (uv_mutex_init(&mutex)) {
      throw "uv_muxtex_init fail";
    }
  }

  ~WaitThread() {
    if (data) {
      delete [] data;
      data = 0;
    }
    uv_cond_destroy(&cond);
    uv_mutex_destroy(&mutex);
  }

  void lock() {
    LockHandle lock(mutex);
    if (locked)
      throw "cannot lock twice";
    locked = true;
    uv_cond_wait(&cond, &mutex);
  }

  bool is_locked() {
    return locked;
  }

  void unlock() {
    LockHandle lock(mutex);
    if (!locked)
      throw "cannot unlock";
    locked = false;
    uv_cond_broadcast(&cond);
  }

  void setData(char * d) {
    if (!locked)
      throw "must locked";
    if (data) {
      delete [] data;
    }
    data = d;
  }

  // 返回的数据不再被内存管理
  char* getData() {
    if (locked)
      throw "must unlock";
    char * ret = data;
    data = 0;
    return ret;
  }
};


//
// 性能并不高的内存分配器, 在新线程中调用
//
class ArrayBufferAllocator : public ArrayBuffer::Allocator {
public:
  void* Allocate(size_t length) {
    return calloc(length, 1);
  }

  void* AllocateUninitialized(size_t length) {
    return malloc(length);
  }

  void Free(void* data, size_t length) {
    free(data);
  }
};


class SaveCallFunction {
private:
  Persistent<Function> fn;
  Persistent<Object>   co;
  Isolate             *iso;

public:
  SaveCallFunction(Local<Function> cb, Isolate *i,
      Local<Object> thiz) : iso(i) {
    fn.Reset(iso, cb);
    co.Reset(iso, thiz);
  }
  SaveCallFunction(const SaveCallFunction &o) : iso(o.iso) {
    fn.Reset(iso, o.fn);
    co.Reset(iso, o.co);
  }
  SaveCallFunction& operator = (const SaveCallFunction &o) {
    iso = o.iso;
    fn.Reset(iso, o.fn);
    co.Reset(iso, o.co);
    return *this;
  }
  ~SaveCallFunction() {
    fn.Reset();
  }
  void call() {
    Local<Function> f = fn.Get(iso);
    Local<Object>   c = co.Get(iso);
    f->Call(c, 0, 0);
  }
};


#endif
