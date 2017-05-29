#ifndef THREAD_TIMER
#define THREAD_TIMER

#include <node.h>
#include <v8.h>
#include <map>
#include "tools.h"

using namespace v8;

class TimerPool;
typedef int32_t timer_id;
typedef SaveCallFunction TimerCall;
#define TIME_OFFSET(a) (a+4) //ms


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
  void stop();
  void setPool(TimerPool *p);
  void call();
  timer_id id();
};


class TimerPool {
private:
  typedef timer_id tp_key;
  typedef Timer*   tp_val;
  typedef std::map<tp_key, tp_val>         tp_map;
  typedef std::pair<const tp_key, tp_val>  tp_pr;

  uv_loop_t   *loop;
  tp_map      pool;
  tp_key      id;

public:
  TimerPool(uv_loop_t *);

  // 池中所有的对象都被内存回收
  ~TimerPool();

  // 返回的对象已经存入池中由池管理内存
  Timer* createTimer(TimerCall &cb);
  // 返回 0 或 Timer 指针, 弹出的对象不再被内存管理
  Timer* pop(tp_key key);
};


void InitTimerFunctions(
  Isolate *isolate, TimerPool *data, uv_async_t *event_target);


#endif // THREAD_TIMER
