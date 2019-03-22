#include <uv.h>
#include "timeImpl.h"
#include "data.h"
#include "tools.h"


static void timeout_one_cb(uv_timer_t* handle) {
  if (!handle->data) return;
  Timer* t = reinterpret_cast<Timer*>(handle->data);
  t->call();
  delete t;
}


static void timeout_repeat_cb(uv_timer_t* handle) {
  if (!handle->data) return;
  Timer* t = reinterpret_cast<Timer*>(handle->data);
  t->call();
}


static void recv_tick_event(uv_async_t* handle) {
  if (!handle->data) return;
  TimerPool *tpool = reinterpret_cast<TimerPool*>(handle->data);
  tpool->do_tick();
}


TimerPool::TimerPool(uv_loop_t *l) : id(1), loop(l) {
  tick_event = new uv_async_t();
  tick_event->data = this;
  uv_async_init(loop, tick_event, recv_tick_event);
  uv_unref(_TO_(tick_event));
}


TimerPool::~TimerPool() {
  for (auto i = pool.begin(); i != pool.end(); ++i) {
    Timer *t = i->second;
    t->setPool(0);
    delete t;
  }
  pool.clear();
  DEL_UV_ASYNC(tick_event);
  tick_event->data = 0;
  tick_event = 0;
}


Timer* TimerPool::createTimer(TimerCall &cb) {
  timer_id tid = ++id;
  Timer *t = new Timer(loop, cb, tid);
  t->setPool(this);
  pool.insert(tp_pair(tid, t));
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


void TimerPool::push_tick(timer_id id) {
  tick_queue.push_back(id);
  uv_ref(_TO_(tick_event));
  uv_async_send(tick_event);
}


void TimerPool::do_tick() {
  while (!tick_queue.empty()) {
    timer_id id = tick_queue.back();
    tick_queue.pop_back();

    Timer * t = pop(id);
    if (t) {
      t->call(false);
      t->setPool(0);
      delete t;
    }
  }
  uv_unref(_TO_(tick_event));
}


Timer::Timer(uv_loop_t *loop, TimerCall &cb, timer_id _i)
     : _id(_i), fn(cb), pool(0) {
  handle = new uv_timer_t();
  handle->data = this;
  uv_timer_init(loop, handle);
}


Timer::~Timer() {
  uv_timer_stop(handle);
  DEL_UV_ASYNC(handle);
  handle->data = 0;
  handle = 0;
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


void Timer::call(bool call_tick) {
  if (pool && call_tick) pool->do_tick();
  fn.call();
}


void Timer::start(uint64_t timeout, uint64_t repeat) {
  if (!handle) return;
  if (repeat == 0) {
    uv_timer_start(handle, timeout_one_cb, timeout, repeat);
  } else {
    uv_timer_start(handle, timeout_repeat_cb, timeout, repeat);
  }
}


static inline void _j_time(const FunctionCallbackInfo<Value>& args,
    Isolate *iso, uint64_t timeout, uint64_t repeat, uint8_t mask=0) {

  HandleScope scope(iso);
  CHECK_TYPE(Function, iso, args[0], "callback function is null");
  GET_FCI_EXTERNAL_ATTR(args, _ex, TimerPool, times);

  Local<Context> context = iso->GetEnteredContext();
  Local<Object> global = context->Global();

  Local<External> event_target_warp =
    global->GetHiddenValue(
      String::NewFromUtf8(iso, "event_target")).As<External>();
  uv_async_t *event_target = (uv_async_t *) event_target_warp->Value();

  TimerCall scb(args[0].As<Function>(), iso, args.This(), event_target);
  Timer* timer = times->createTimer(scb);

  if (mask & TIME_TICK) {
    times->push_tick(timer->id());
  } else {
    timer->start(timeout, repeat);
  }

  Local<Object> ret = Object::New(iso);
  ret->Set(V8_CHAR(iso, "name"), V8_CHAR(iso, "timeid"));
  ret->SetHiddenValue(V8_CHAR(iso, "id"), Uint32::New(iso, timer->id()));
  args.GetReturnValue().Set(ret);
}


void j_setTimeout(const FunctionCallbackInfo<Value>& args) {
  INIT_ISOLATE_FCI(iso, args);
  CHECK_TYPE(Uint32, iso, args[1], "delay milliseconds is null");
  _j_time(args, iso, TIME_OFFSET(args[1]->ToUint32()->Value()), 0);
}


void j_setInterval(const FunctionCallbackInfo<Value>& args) {
  INIT_ISOLATE_FCI(iso, args);
  CHECK_TYPE(Uint32, iso, args[1], "repeat milliseconds is null");
  uint64_t repeat = args[1]->ToUint32()->Value();
  _j_time(args, iso, TIME_OFFSET(repeat), repeat);
}


void j_setImmediate(const FunctionCallbackInfo<Value>& args) {
  INIT_ISOLATE_FCI(iso, args);
  _j_time(args, iso, 0, 0);
}


void j_next_tick(const FunctionCallbackInfo<Value>& args) {
  INIT_ISOLATE_FCI(iso, args);
  _j_time(args, iso, 0, 0, TIME_TICK);
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
        // 减少释放内存的步骤, 不能把这一步放入 pop()
        // 因为 Timer 还需要 pool 做一些事情.
        t->setPool(0);
        delete t;
      }
    }
  }
}


// F(name, fn)
#define ALL_TIME_METHOD(F)   \
  F("setTimeout",     j_setTimeout)   \
  F("setInterval",    j_setInterval)  \
  F("setImmediate",   j_setImmediate) \
  F("clearTimeout",   j_clear_time)   \
  F("clearInterval",  j_clear_time)   \
  F("clearImmediate", j_clear_time)   \
  F("_next_tick",     j_next_tick)


void InitTimerFunctions(
      Isolate *isolate, TimerPool *tp, uv_async_t *event_target) {
  Local<Context> context = isolate->GetEnteredContext();
  Local<Object> global = context->Global();

  global->SetHiddenValue(
      String::NewFromUtf8(isolate, "event_target"),
      External::New(isolate, event_target) );

#define SET(name, fn) \
    set_method(isolate, global, name, fn, tp);

  ALL_TIME_METHOD(SET);

#undef SET
}


void UninstallTimerFunctions(Isolate *isolate, TimerPool *tp) {
  Local<Context> context = isolate->GetEnteredContext();
  Local<Object> global = context->Global();

#define REMOVE(name, fn) \
    rm_method(isolate, global, name);

  ALL_TIME_METHOD(REMOVE);

#undef REMOVE
}
