
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
    return event.on(name, cb);
  };

  warp.off = function(name, cb) {
    return event.removeListener(name, cb);
  };

  warp.once = function(name, cb) {
    return event.once(name, cb);
  };

  warp.send = function(name, data) {
    thread_context._send(JSON.stringify({
      name : name,
      data : data,
    }));
    return event;
  };

  warp.wait = function() {
    return thread_context._wait();
  };

  thread_context._recv = function(json_str) {
    var obj = JSON.parse(json_str);
    event.emit(obj.name, obj.data);
  };

  return warp;
}
