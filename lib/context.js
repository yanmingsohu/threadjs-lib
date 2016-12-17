
if (exports) {
  exports.wrap_context = wrap_context;
}


//
// 返回的对象可以进行消息操作
//
function wrap_context(thread_context, event) {
  var warp = {};

  warp.threadId = thread_context._t_id;

  warp.on = function(name, cb) {
    event.on(name, cb);
    return warp;
  };

  warp.off = function(name, cb) {
    event.removeListener(name, cb);
    return warp;
  };

  warp.once = function(name, cb) {
    event.once(name, cb);
    return warp;
  };

  warp.send = function(name, data) {
    thread_context._send(JSON.stringify({
      name : name,
      data : data,
    }));
    return warp;
  };

  warp.wait = function() {
    var ret = thread_context._wait();
    if (typeof ret == 'string') {
      ret = JSON.parse(ret);
    }
    return ret;
  };

  thread_context._recv = function(json_str) {
    var obj = JSON.parse(json_str);
    event.emit(obj.name, obj.data);
  };

  thread_context.noListener = function() {
    return event.listenerCount() <= 0;
  };

  return warp;
}
