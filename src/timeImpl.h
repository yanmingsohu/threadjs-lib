#ifndef THREAD_TIMER
#define THREAD_TIMER

#include <node.h>
#include <v8.h>
#include <map>
#include <deque>
#include "tools.h"

using namespace v8;

class TimerPool;
typedef int32_t timer_id;
typedef SaveCallFunction TimerCall;

#define TIME_OFFSET(a)   (a) //ms
#define TIME_TICK        0x01


class Timer {
private:
  TimerCall  fn;
  uv_timer_t handle;
  timer_id   _id;
  TimerPool  *pool;

public:
  Timer(uv_loop_t *loop, TimerCall &cb, timer_id id);
  ~Timer();
  void start(uint64_t timeout, uint64_t repeat);
  void setPool(TimerPool *p);
  void call(bool call_tick=true);
  timer_id id();
};


class TimerPool {
private:
  typedef timer_id tp_key;
  typedef Timer*   tp_val;
  typedef std::map<timer_id, tp_val>         tp_map;
  typedef std::pair<const timer_id, tp_val>  tp_pr;
  typedef std::deque<timer_id>               tp_imme;

  uv_loop_t   *loop;
  tp_map      pool;
  timer_id    id;
  tp_imme     tick_queue;
  uv_async_t  tick_event;

public:
  TimerPool(uv_loop_t *);
  //
  // 池中所有的对象都被内存回收
  //
  ~TimerPool();

  //
  // 返回的对象已经存入池中由池管理内存
  //
  Timer* createTimer(TimerCall &cb);
  //
  // 返回 0 或 Timer 指针, 弹出的对象不再被内存管理
  //
  Timer* pop(timer_id key);

  void push_tick(timer_id id);
  void do_tick();
};


void InitTimerFunctions(
  Isolate *isolate, TimerPool *data, uv_async_t *event_target);


#endif // THREAD_TIMER
