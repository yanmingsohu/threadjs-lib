#include "tools.h"
#include "data.h"
#include <string>
#include <iostream>
#include <sstream>

const char * DEF_FNAME            = "<?>";
const char * THREAD_STOP_ATTR     = "__stop_thread";
const char * THREAD_ID_ATTR       = "_t_id";
const char * USE_JS_CODE_OFF_STR  = "USER_SCRIPT_BEGIN";


class ReportLeak {
private:
  static std::string NULLSTR;
  std::stringbuf buffer;
  std::ostream os;
  void * loop;
  int count;

public:
  ReportLeak(uv_loop_t *l) : os(&buffer), loop(l), count(0) {
  }

  ~ReportLeak() {
    report();
  }

  inline void add(uv_handle_t *h) {
    os << "  [ " << (void*) h << " - " << get_uv_type(h)
       << "\t]:uv_handle_t->data[ " << (void*) h->data << " ]";

    if (uv_is_closing(h)) {
      os << " closing";
    }

    os << "\n";
    ++count;
  }

  inline void report() {
    if (count <= 0)
      return;

    os << "\t-- may not free, on loop[ " << (void*) loop << " ]." << endl;
    printf("%s", buffer.str().c_str());

    count = 0;
    buffer.str(NULLSTR);
  }
};

std::string ReportLeak::NULLSTR = "";


ReqData::~ReqData() {
  state = S_EXIT;
  pool_ref.freeid(thread_id);
  DEL_ARRAY(code);
  DEL_ARRAY(filename);
  DEL_ARRAY(boot_node_file);
  main_iso = 0;
  main_loop = 0;
  sub_iso = 0;
  sub_loop = 0;
  // printf("\n!~ free ReqDAta\n");
}


void walk_report_leak_handle(uv_handle_t* handle, void* p) {
  if (uv_is_closing(handle))
    return;

  //
  // 报告未释放的句柄
  //
  ReportLeak *rl = (ReportLeak *) p;
  rl->add(handle);
}


//
// 停止 loop 并尽可能释放与之相关的资源
//
void ReqData::free_sub_loop() {
  RecvEventData::sendEvent(main_event, "{ \"name\": \"end\" }");
  pool_ref.freeid(thread_id);

  free_recv_event_from(sub_event);
  DEL_UV_ASYNC(sub_event);
  uv_async_send(del_event);

  ReportLeak rl(sub_loop);

  uv_walk(sub_loop, walk_report_leak_handle, &rl);
  uv_run(sub_loop, UV_RUN_DEFAULT);
  DEL_LOOP(sub_loop);
}
