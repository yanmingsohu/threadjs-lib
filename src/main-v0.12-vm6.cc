#include <node.h>
#include <v8.h>
#include <v8-debug.h>
#include <uv.h>
#include <iostream>
#include <set>
#include <sstream>
#include "data.h"
#include "serialize.h"

using namespace v8;
using namespace node;
using namespace std;


static ID_container id_pool;


static void find_code_offset(char *code, int &offsetline) {
  char *begin;
  char *end = strstr(code, USE_JS_CODE_OFF_STR);

  if (end) {
    begin = code - 1;
    --offsetline;

    while (++begin < end)
      if (*begin == '\n')
        --offsetline;
  }
}


static inline Local<Script> compilerCode(ReqData *data) {
  int offsetline = 0;
  find_code_offset(data->code, offsetline);

  Local<String> filename = String::NewFromUtf8(data->sub_iso, data->filename);
  ScriptOrigin origin(filename, Integer::New(data->sub_iso, offsetline));

  Local<String> code = String::NewFromUtf8(data->sub_iso, data->code);
  ScriptCompiler::Source source(code, origin);

  TryCatch jtry;
  Local<UnboundScript> unbound = ScriptCompiler::CompileUnbound(data->sub_iso, &source);
  CACHE_V8_ERR_SEND_EVNET(data->sub_iso, data->main_event, jtry, "CompilerError");
  Local<Script> script = unbound->BindToCurrentContext();
  return script;
}


//
// 向另一个线程发送数据
//
void j_send_event(const FunctionCallbackInfo<Value>& args) {
  RET_OBJ_FUNCTION_INIT(iso, args, thiz) {
    GET_FCI_EXTERNAL_ATTR(args, edata, RecvEventData, data);
    CHECK_TYPE(String, data->iso, args[0], "first argument must be JSON string");
    Local<String> pd = args[0].As<String>();
    data->pushEvent(pd);
  } else {
    CALL_JS_OBJ_FN_STR1(iso, thiz, "_throw_error", "thread is closed");
  }
}


//
// 终止线程
//
void j_stop(const FunctionCallbackInfo<Value>& args) {
  RET_OBJ_FUNCTION_INIT(iso, args, thiz) {
    GET_FCI_EXTERNAL_ATTR(args, edata, ReqData, req);
    req->running = false;

    if (req->sub_loop && uv_loop_alive(req->sub_loop)) {
      req->terminated = true;
      V8::TerminateExecution(req->sub_iso);
    }
    if (req->sub_event) {
      uv_async_send(req->sub_event);
    }
  } else {
    CALL_JS_OBJ_FN_STR1(iso, thiz, "_throw_error", "thread is closed");
  }
}


void j_use_time(const FunctionCallbackInfo<Value>& args) {
  RET_OBJ_FUNCTION_INIT(iso, args, thiz) {
    GET_FCI_EXTERNAL_ATTR(args, edata, ReqData, req);
    uint32_t used = (uint32_t) req->usedTime();
    args.GetReturnValue().Set(Integer::NewFromUnsigned(iso, used));
  }
}


//
// 互相绑定事件
//
static void bind_peer_event(ReqData *data) {
  RecvEventData *mainEve = (RecvEventData*) data->main_event->data;
  RecvEventData *subEve  = (RecvEventData*) data->sub_event->data;
  subEve->peer  = data->main_event;
  mainEve->peer = data->sub_event;
  mainEve->swap_not_send_peer();
}


//
// 接收另一个线程发来的消息
//
static void recv_other_thread_event(uv_async_t *handle) {
  RecvEventData *data = (RecvEventData*) handle->data;
  HandleScope scope(data->iso);
  Isolate::Scope isolate_scope(data->iso);
  EventData event;

  while (data->nextEvent(event)) {
    Local<String> name = String::NewFromUtf8(data->iso, "_recv");
    Local<Value> func = data->getMain()->Get(name);

    if (!func->IsFunction()) {
      THROW_EXP(data->iso, "error: _recv is not function");
      return;
    }

    Local<Function> f_recv = func.As<Function>();
    Local<Value> argv[] = { event.getData(data->iso) };
    f_recv->Call(data->getMain(), 1, argv);
    event.free();
  }
}


//
// 创建异步消息, 绑定方法, 设置隐藏变量
//
template<class T>
static uv_async_t* create_uv_async(
    Isolate *isolate, T j_context, uv_loop_t *loop,
    uv_async_t *&target, char* name="peer")
{
  uv_async_t *recv_async = new uv_async_t();
  RecvEventData *recv_data = new RecvEventData(isolate, j_context);
  recv_async->data = recv_data;
  uv_async_init(loop, recv_async, recv_other_thread_event);
  set_method(isolate, j_context, "_send", j_send_event, recv_data);
  recv_data->name = name;
  target = recv_async;
  return recv_async;
}


static void do_script(void *arg) {
  LocalPoint<ReqData>   data((ReqData *)arg);
  uv_async_t            *main_event = data->main_event;
  int                   code = 0;
  bool                  more;

  try {
    CREATE_ISOLATE(isolate);
    Isolate::Scope isolate_scope(isolate);
    //
    // Fatal error in heap setup
    // Allocation failed - process out of memory
    //
    code = 1;
    Locker locker(isolate);
    HandleScope scope(isolate);
    data->sub_iso = isolate;

    code = 2;
    Local<Context> context = Context::New(isolate);
    Context::Scope context_scope(context);
    Local<Object> j_context = context->Global();
    Local<Script> script = compilerCode(data.get());

    code = 3;
    uv_loop_t *loop = new uv_loop_t();
    uv_loop_init(loop);
    data->sub_loop = loop;

    code = 4;
    create_uv_async(isolate, j_context, loop, data->sub_event, "SUB");
    bind_peer_event(data.get());
    id_pool.setid(isolate, j_context, data.get());

    {
      // TimeHandle local
      code = 5;
      ReqData::TimeHandle th(data);
      script->Run();
      th.update();
    }

    code = 6;
    if (!CALL_JS_OBJ_FN_RET_BOOL(isolate, j_context, "noListener")) {
      code = 7;
      while (data->running) {
        ReqData::TimeHandle th(data);
        more = uv_run(data->sub_loop, UV_RUN_ONCE);

        if (RecvEventData::hasEvent(main_event)) {
          uv_async_send(main_event);
          continue;
        }
        if (!more) {
          break;
        }
        if (data->terminated) {
          break;
        }
        if (CALL_JS_OBJ_FN_RET_BOOL(isolate, j_context, "noListener")) {
          break;
        }
      }
    }

  } catch(...) {
    std::string msg("Error: cannot create thread,");

    switch(code) {
      case 1:
        msg += "v8 Fatal error in heap setup"; break;
      case 2:
        msg += "compiler js code fail."; break;
      default:
        msg += "unknow code=" + code; break;
    }

    Json root;
    root.set("name", "error");
    Json data = root.childen("data");
    data.set("name", "Error");
    data.set("code", code);
    data.set("message", msg);
    data.end();
    root.end();
    RecvEventData::sendEvent(main_event, root);
  }
}


static void recv_delete_event(uv_async_t *del_event) {
  uv_async_t* main_event = (uv_async_t*) del_event->data;
  DEL_UV_HANDLE_RECV_EVENT(main_event);
  DEL_UV_ASYNC(del_event);
}


//
// 主线程创建线程对象，并返回给脚本，线程会立即启动
//
void j_create(const FunctionCallbackInfo<Value>& args) {
  INIT_ISOLATE_FCI(iso, args);
  CHECK_TYPE(String, iso, args[0], "first arg must be string.");

  uv_loop_t   *loop     = uv_default_loop();
  uv_thread_t *req      = new uv_thread_t();
  ReqData     *reqdata  = new ReqData(iso, loop, id_pool);

  v8val_to_char(args[0], reqdata->code, reqdata->l_code);
  v8val_to_char(args[1], reqdata->filename, reqdata->l_filename);

  //
  // 这是返回给 js 的对象, 用于操作底层方法, 将被另一个 jobject 包装
  //
  Local<Object> ret = Object::New(iso);
  create_uv_async(iso, ret, loop, reqdata->main_event, "MAIN");
  set_method(iso, ret, "_stop", j_stop, reqdata);
  set_method(iso, ret, "_use_time", j_use_time, reqdata);
  id_pool.newid(iso, ret, reqdata);

  //
  // 删除 uv_async_t(del_event, main_event) 必须在当前线程中做
  //
  uv_async_t* del_event = new uv_async_t();
  del_event->data = reqdata->main_event;
  reqdata->del_event = del_event;
  uv_async_init(loop, del_event, recv_delete_event);

  args.GetReturnValue().Set(ret);

  //
  // 初始化工作在线程启动之前完成
  //
  uv_thread_create(req, do_script, reqdata);
}


void j_version(const FunctionCallbackInfo<Value>& args) {
  Isolate *iso = args.GetIsolate();
  HandleScope scope(iso);
  Local<String> ver = String::NewFromUtf8(iso, v8::V8::GetVersion());
  args.GetReturnValue().Set(ver);
}


void init(Handle<Object> exports) {
  void hook_error();
  hook_error();
  NODE_SET_METHOD(exports, "v8version", j_version);
  NODE_SET_METHOD(exports, "create", j_create);
  NODE_SET_METHOD(exports, "ser_test", j_test_ser);
}

NODE_MODULE(threadnv, init)