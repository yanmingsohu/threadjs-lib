#include "tools.h"
#include "data.h"

const char * DEF_FNAME            = "<?>";
const char * THREAD_STOP_ATTR     = "__stop_thread";
const char * THREAD_ID_ATTR       = "_t_id";
const char * USE_JS_CODE_OFF_STR  = "USER_SCRIPT_BEGIN";



ReqData::~ReqData() {
  pool_ref.freeid(thread_id);
  RecvEventData::sendEvent(main_event, "{ \"name\": \"end\" }");
  uv_async_send(del_event);
  DEL_ARRAY(code);
  DEL_ARRAY(filename);
  DEL_UV_HANDLE_RECV_EVENT(sub_event);
  DEL_LOOP(sub_loop);
  main_iso = 0;
  main_loop = 0;
  // printf("!~ free ReqDAta");
}
