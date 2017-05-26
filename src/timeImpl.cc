#include <uv.h>
#include "timeImpl.h"
#include "data.h"
#include "tools.h"


void j_setTimeout(const FunctionCallbackInfo<Value>& args);
void j_setInterval(const FunctionCallbackInfo<Value>& args);
void j_setImmediate(const FunctionCallbackInfo<Value>& args);
void j_clear_time(const FunctionCallbackInfo<Value>& args);


void InitTimerFunctions(Isolate *isolate,
      TimerPool *tp, uv_async_t *event_target) {
  Local<Context> context = isolate->GetEnteredContext();
  Local<Object> global = context->Global();

  global->SetHiddenValue(
    String::NewFromUtf8(isolate, "event_target"),
    External::New(isolate, event_target) );

  set_method(isolate, global, "setTimeout",     j_setTimeout,   tp);
  set_method(isolate, global, "setInterval",    j_setInterval,  tp);
  set_method(isolate, global, "setImmediate",   j_setImmediate, tp);
  set_method(isolate, global, "clearTimeout",   j_clear_time,   tp);
  set_method(isolate, global, "clearInterval",  j_clear_time,   tp);
  set_method(isolate, global, "clearImmediate", j_clear_time,   tp);
}


static void timeout_one_cb(uv_timer_t* handle) {
  Timer* t = reinterpret_cast<Timer*>(handle->data);
  t->call();
  delete t;
}


static void timeout_repeat_cb(uv_timer_t* handle) {
  Timer* t = reinterpret_cast<Timer*>(handle->data);
  t->call();
}


TimerPool::TimerPool(uv_loop_t *l) : id(1), loop(l) {
}


TimerPool::~TimerPool() {
  for (auto i = pool.begin(); i != pool.end(); ++i) {
    Timer *t = i->second;
    t->setPool(0);
    delete t;
  }
  pool.clear();
}


Timer* TimerPool::createTimer(TimerCall &cb) {
  timer_id tid = ++id;
  Timer *t = new Timer(loop, cb, tid);
  t->setPool(this);
  pool.insert(tp_pr(tid, t));
  return t;
}


Timer* TimerPool::pop(tp_key key) {
  auto item = pool.find(key);
  if (item == pool.end())
    return 0;
  Timer * ret = item->second;
  pool.erase(item);
  return ret;
}


Timer::Timer(uv_loop_t *loop, TimerCall &cb, timer_id _i)
    : _id(_i), fn(cb), pool(0) {
  handle.data = this;
  uv_timer_init(loop, &handle);
}


Timer::~Timer() {
  stop();
  if (pool && _id) {
    pool->pop(_id);
  }
}


void Timer::setPool(TimerPool *p) {
  pool = p;
}


timer_id Timer::id() {
  return _id;
}


void Timer::call() {
  fn.call();
}


void Timer::start(uint64_t timeout, uint64_t repeat) {
  if (repeat == 0) {
    uv_timer_start(&handle, timeout_one_cb, timeout, repeat);
  } else {
    uv_timer_start(&handle, timeout_repeat_cb, timeout, repeat);
  }
}


void Timer::stop() {
  uv_timer_stop(&handle);
}


static inline void _j_time(const FunctionCallbackInfo<Value>& args,
    Isolate *iso, uint64_t timeout, uint64_t repeat) {
  CHECK_TYPE(Function, iso, args[0], "callback function is null");
  GET_FCI_EXTERNAL_ATTR(args, _ex, TimerPool, times);

  Local<Context> context = iso->GetEnteredContext();
  Local<Object> global = context->Global();

  Local<External> event_target_warp =
    global->GetHiddenValue(String::NewFromUtf8(iso, "event_target")).As<External>();
  uv_async_t *event_target = (uv_async_t *) event_target_warp->Value();

  TimerCall scb(args[0].As<Function>(), iso, args.This(), event_target);
  Timer* timer = times->createTimer(scb);
  timer->start(timeout, repeat);

  Local<Object> ret = Object::New(iso);
  ret->Set(V8_CHAR(iso, "name"), V8_CHAR(iso, "timeid"));
  ret->SetHiddenValue(V8_CHAR(iso, "id"), Uint32::New(iso, timer->id()));
  args.GetReturnValue().Set(ret);
}


void j_setTimeout(const FunctionCallbackInfo<Value>& args) {
  INIT_ISOLATE_FCI(iso, args);
  CHECK_TYPE(Uint32, iso, args[1], "delay milliseconds is null");
  _j_time(args, iso, args[1]->ToUint32()->Value(), 0);
}


void j_setInterval(const FunctionCallbackInfo<Value>& args) {
  INIT_ISOLATE_FCI(iso, args);
  CHECK_TYPE(Uint32, iso, args[1], "repeat milliseconds is null");
  uint64_t repeat = args[1]->ToUint32()->Value();
  _j_time(args, iso, repeat, repeat);
}


void j_setImmediate(const FunctionCallbackInfo<Value>& args) {
  INIT_ISOLATE_FCI(iso, args);
  _j_time(args, iso, 0, 0);
}


void j_clear_time(const FunctionCallbackInfo<Value>& args) {
  INIT_ISOLATE_FCI(iso, args);
  if (args[0]->IsObject()) {
    Local<Value> a0 = args[0]->ToObject()->GetHiddenValue(V8_CHAR(iso, "id"));
    if (a0->IsUint32()) {
      timer_id id = a0->ToUint32()->Value();
      GET_FCI_EXTERNAL_ATTR(args, _ex, TimerPool, times);
      Timer *t = times->pop(id);
      if (t) {
        t->setPool(0);
        delete t;
      }
    }
  }
}
