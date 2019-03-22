#ifndef THREAD_DATA_H
#define THREAD_DATA_H

#include <node.h>
#include <v8.h>
#include <uv.h>
#include <iostream>
#include <queue>
#include <sstream>
#include <string.h>
#include <map>

using namespace v8;
using namespace node;

typedef unsigned long T_ID;
class ID_container;
class ObjectMap;

extern const char * DEF_FNAME;
extern const char * THREAD_STOP_ATTR;
extern const char * THREAD_ID_ATTR;
extern const char * USE_JS_CODE_OFF_STR;
extern ObjectMap object_container;


class ObjectMap {
private:
  typedef int tp_key;
  typedef void* tp_val;
  typedef std::map<tp_key, tp_val> tp_map;
  typedef std::pair<const tp_key, tp_val>  tp_pair;

  tp_map pool;
  int __object_id;
  uv_mutex_t& lock;

public:
  ObjectMap(uv_mutex_t& global_lock)
      : __object_id(0), lock(global_lock) {
  }

  // 成功返回 true
  template<class T>
  bool get(T*& point, tp_key id) {
    if (id == 0)
      return false;
    LockHandle __id(lock);
    auto item = pool.find(id);
    if (item == pool.end())
      return false;
    point = (T*) item->second;
    return true;
  }

  template<class T>
  bool get(T*& point, void* id) {
    return get(point, (tp_key) id);
  }

  // 成功返回为指针分配的 id
  template<class T>
  tp_key put(T* point) {
    LockHandle __id(lock);
    if (point == 0) return 0;
    tp_key id = ++__object_id;
    pool.insert(tp_pair(id, point));
    return id;
  }

  // 删除成功返回 true
  bool rm(tp_key id) {
    LockHandle __id(lock);
    auto item = pool.find(id);
    if (item == pool.end())
      return false;
    pool.erase(item);
    return true;
  }

  bool rm(void* id) {
    return rm((tp_key) id);
  }
};


struct EventData {
  char * data;
  size_t len;

  EventData() : data(0), len(0) {}

  EventData(Local<String> &d) {
    v8val_to_char(d, data, len);
  }

  EventData(const char *src) {
    len = strlen(src) + 1;
    data = new char[len];
    strcpy(data, src);
  }

  void free() {
    DEL_ARRAY(data);
    len = 0;
  }

  inline Local<String> getData(Isolate *iso) {
    return String::NewFromUtf8(iso, data);
  }
};

typedef std::queue<EventData> JS_EVENTS;


struct RecvEventData {
private:
  JS_EVENTS     *not_send;
  uv_mutex_t    _lock;
  JS_EVENTS     events;

  void init() {
    uv_mutex_init(&_lock);
    not_send = new JS_EVENTS();
  }

public:
  Isolate             *iso;
  uv_async_t          *peer;
  Persistent<Object>  *main;
  char                *name;
  int                 ref;

  RecvEventData(): iso(0), peer(0), name(0), ref(0), not_send(0)
  {
    init();
  }

  template<class T>
  RecvEventData(Isolate *_i, Local<T> &o, uv_async_t* p=0)
  : iso(_i), peer(p), name(0), ref(0), not_send(0)
  {
    // main = copy(_i, o.As<Object>());
    main = copy(_i, Local<Object>::Cast<T>(o));
    init();
  }

  ~RecvEventData() {
    // [ name, peer, iso, ] donot DELETE!
    delete main;
    delete not_send;
    uv_mutex_destroy(&_lock);
    iso  = 0;
    peer = 0;
    main = 0;
    name = 0;
  }

  //
  // send event to peer
  // T: { Local<String> , char* }
  //
  template<class T>
  void inline pushEvent(T &data) {
    if (peer) {
      sendEvent(peer, data);
    } else {
      not_send->push(EventData(data));
    }
  }

  template<class T>
  static inline void sendEvent(uv_async_t *async, T &data) {
    RecvEventData* rdata;
    if (!object_container.get(rdata, async->data))
      return;
    LockHandle lock(rdata->_lock);
    rdata->events.push(EventData(data));
    uv_async_send(async);
  }

  static inline void sendEvent(uv_async_t *async, std::ostringstream stream) {
    sendEvent(async, stream.str());
  }

  static inline void sendEvent(uv_async_t *async, std::string str) {
    const char* ch = str.c_str();
    sendEvent(async, ch);
  }

  static inline void sendEvent(uv_async_t *async, Json &js) {
    sendEvent(async, js.str());
  }

  void swap_not_send_peer() {
    if (not_send && peer) {
      RecvEventData* peerdata;
      if (!object_container.get(peerdata, peer->data))
        return;
      LockHandle lock(peerdata->_lock);
      // peerdata->events.swap(*not_send);
      while (!not_send->empty()) {
        peerdata->events.push(not_send->front());
        not_send->pop();
      }
      uv_async_send(peer);
      delete not_send;
      not_send = 0;
    }
  }

  //
  // return 'true' if has event
  //
  bool nextEvent(EventData &data) {
    LockHandle lock(_lock);
    if (events.empty()) {
      return false;
    }
    data = events.front();
    events.pop();
    return true;
  }

  Local<Object> getMain() {
    return copy(iso, main);
  }

  bool hasEvent() {
    return !events.empty();
  }

  bool peerHasEvent() {
    if (peer) {
      return hasEvent(peer);
    }
    return false;
  }

  static inline bool hasEvent(uv_async_t *async) {
    RecvEventData* recv;
    if (!object_container.get(recv, async->data))
      return false;
    return recv->hasEvent();
  }
};


struct ReqData {
  Isolate         *main_iso;    // !not free
  uv_loop_t       *main_loop;   // !not free
  uv_async_t      *main_event;  // !not free
  uv_async_t      *del_event;   // !not free

  Isolate         *sub_iso;     // !not free
  uv_loop_t       *sub_loop;
  uv_async_t      *sub_event;
  bool            running;

  char            *code;
  int             l_code;
  char            *filename;
  int             l_filename;
  T_ID            thread_id;
  ID_container    &pool_ref;
  bool            terminated;
  char*           boot_node_file;

  uint64_t        begin_time;
  uint64_t        end_time;

  WaitThread      wait;
  enum { S_EXIT=0xFC, S_INIT } state;


  ReqData(Isolate *mi, uv_loop_t *muv, ID_container &pool) :
    main_iso(mi)   , main_loop(muv)  , main_event(0)  , del_event(0)  ,
    sub_iso(0)     , sub_loop(0)     , sub_event(0)   , running(true) ,
    code(0)        , l_code(0)       , filename(0)    , l_filename(0) ,
    thread_id(0)   , pool_ref(pool)  , terminated(0)  , begin_time(0) ,
    end_time(0)    , state(S_INIT)   , boot_node_file(0)
  {
    init();
  }

  ~ReqData();

  void free_sub_loop();

  void dump() {
    std::cout
      << ">> filename   " << (void*)filename << " " << filename
      << "\n   code       " << (void*) code
      << "\n   sub_loop   " << sub_loop
      << "\n   sub_event  " << sub_event
      << "\n   main_event " << main_event
      << std::endl;
  }

  inline uint64_t usedTime() {
    if (end_time > 0) {
      return end_time - begin_time;
    } else {
      uv_update_time(sub_loop);
      uint64_t now = uv_now(sub_loop);
      return now - begin_time;
    }
  }

  class TimeHandle {
    ReqData *data;
    void init() {
      data->begin_time = uv_now(data->sub_loop);
      data->end_time = 0;
    }
   public:
    TimeHandle(ReqData *rd) : data(rd) {
      init();
    }
    TimeHandle(LocalPoint<ReqData> &lp) : data(lp.get()) {
      init();
    }
    ~TimeHandle() {
      data->end_time = uv_now(data->sub_loop);
    }
    void update() {
      uv_update_time(data->sub_loop);
    }
  };

private:
  void init() {
    if (!filename) {
      filename = new char[sizeof(DEF_FNAME)];
      memcpy(filename, DEF_FNAME, sizeof(DEF_FNAME));
    }
  }
};


class ID_container {
  std::set<T_ID>  thread_id_pool;
  T_ID            _id;
  uv_mutex_t      _lock;

  template<class JT>
  inline T_ID _getid(Isolate *iso, JT &jobj) {
    HandleScope scope(iso);
    Local<Value> jid = jobj->Get(String::NewFromUtf8(iso, THREAD_ID_ATTR));
    if (jid->IsUint32()) {
      return jid->ToUint32()->Value();
    } else {
      return 0;
    }
  }

  ID_container(ID_container &);
  void operator=(ID_container &);

public:
  ID_container() : _id(1) {
    uv_mutex_init(&_lock);
  }

  ~ID_container() {
    uv_mutex_destroy(&_lock);
  }

  inline T_ID newid() {
    LockHandle lockthread(_lock);
    T_ID id = _id++;
    thread_id_pool.insert(id);
    return id;
  }

  inline void freeid(T_ID o) {
    LockHandle lockthread(_lock);
    thread_id_pool.erase(o);
  }

  inline bool notfree(T_ID i) {
    LockHandle lockthread(_lock);
    return thread_id_pool.count(i) > 0;
  }

  template<class JT>
  inline void newid(Isolate *iso, JT &jobj, ReqData* rd) {
    rd->thread_id = newid();
    setid(iso, jobj, rd->thread_id);
  }

  template<class JT>
  inline void setid(Isolate *iso, JT &jobj, T_ID i) {
    jobj->Set(
      String::NewFromUtf8(iso, THREAD_ID_ATTR),
      Integer::NewFromUnsigned(iso, i));
  }

  template<class JT>
  inline void setid(Isolate *iso, JT &jobj, ReqData* rd) {
    setid(iso, jobj, rd->thread_id);
  }

  template<class JT>
  inline void freeid(Isolate *iso, JT &jobj) {
    freeid(_getid(iso, jobj));
  }

  template<class JT>
  inline bool notfree(Isolate *iso, JT &jobj) {
    return notfree(_getid(iso, jobj));
  }
};


#endif // THREAD_DATA_H
