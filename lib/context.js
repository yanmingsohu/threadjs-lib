
if (exports) {
  exports.wrap_context = wrap_context;
}


//
// 返回的对象可以进行消息操作
//
function wrap_context(thread_context, event) {
  var NO_NAME = '<anonymous>';
  var bind_filters = [];

  var warp = {
    threadId            : thread_context._t_id,
    on                  : on,
    off                 : off,
    offall              : offall,
    once                : once,
    send                : send,
    wait                : wait,
    eval                : eval,
    create_context      : create_context,
    binding             : binding,
    add_bind_filter     : add_bind_filter,
    remove_bind_filter  : remove_bind_filter,
  };

  thread_context._recv = _recv;
  thread_context.noListener = noListener;

return warp;


  function noListener() {
    return event.listenerCount() <= 0;
  }


  function _recv(json_str) {
    try {
      var obj = JSON.parse(json_str);
      event.emit(obj.name, obj.data);
    } catch(err) {
      warp.send('error', {
        name    : err.name,
        message : err.message,
        stack   : err.stack,
      });
    }
  }


  function on(name, cb) {
    event.on(name, cb);
    return warp;
  }


  function off(name, cb) {
    event.removeListener(name, cb);
    return warp;
  }


  function offall() {
    event.removeAllListeners();
    return warp;
  }


  function once(name, cb) {
    event.once(name, cb);
    return warp;
  }


  function send(name, data) {
    thread_context._send(JSON.stringify({
      name : name,
      data : data,
    }));
    return warp;
  }


  function wait(name, data) {
    var ret = thread_context._wait(JSON.stringify({
      name : name || '_thread_locked',
      data : data,
    }));
    if (typeof ret == 'string') {
      ret = JSON.parse(ret);
    }
    return ret;
  }


  function eval(code, filename, offset, context) {
    return thread_context._eval(
      filename || NO_NAME, code, offset || 0, context);
  }


  function create_context() {
    return thread_context._create_context();
  }


  function binding(name, _obj) {
    if (bind_filters.length > 0) {
      for (var i=0, e=bind_filters.length; i<e; ++i) {
        if (bind_filters[i](name))
          throw new Error('deter binding native `' + name + '` module');
      }
    }
    return thread_context._binding(_obj || {}, name);
  }


  function add_bind_filter(filter) {
    var i = _find_filter(filter);
    if (isNaN(i)) {
      return bind_filters.push(filter)-1;
    }
  }


  function remove_bind_filter(filter) {
    var i = _find_filter(filter);
    if (!isNaN(i)) {
      bind_filters.splice(i, 1);
      return i;
    }
  }


  function _find_filter(filter) {
    for (var i=bind_filters.length-1; i>=0; --i) {
      if (bind_filters[i] === filter) {
        return i;
      }
    }
  }
}
