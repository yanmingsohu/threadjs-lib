#include "tools.h"

void when_handle_closed_cb(uv_handle_t* handle) {
  delete handle;
}
