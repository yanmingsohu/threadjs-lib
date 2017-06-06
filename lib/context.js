
if (exports) {
  exports.wrap_context = wrap_context;
}

//
// 返回的对象可以进行消息操作
//
function wrap_context(thread_context, event) {
  var NO_NAME = '<anonymous>';
  var type_constructor = [];

  thread_context._recv      = _recv;
  thread_context.noListener = noListener;

  var warp = {
    CONSTRUCTORS        : {},
    threadId            : thread_context._t_id,
    on                  : on,
    off                 : off,
    offall              : offall,
    once                : once,
    send                : send,
    send_error          : send_error,
    emit                : emit,
    wait                : wait,
    eval                : eval,
    create_context      : create_context,
    runMicrotasks       : thread_context._runMicrotasks,
    reg_constructor     : reg_constructor,
  };

  reg_constructor(_error_constructor, 'Error');


return warp;

  //
  // 通过类型 id 来构建对象, fn 即对象构建器
  // fn   : Function(data) 返回使用 data 创建的对象实例.
  // name : 注册到 CONSTRUCTORS 变量中的名字.
  //
  function reg_constructor(fn, name) {
    var id = type_constructor.length;
    type_constructor.push(fn);
    if (!name) {
      name = fn.name;
    }
    if (name) {
      if (warp.CONSTRUCTORS[name])
        throw new Error('"' + name + '" is reged');

      warp.CONSTRUCTORS[name] = id;
    }
    return id;
  }


  function noListener() {
    return event.listenerCount() <= 0;
  }


  function _recv(json_str) {
    try {
      var obj  = JSON.parse(json_str);
      var cons = type_constructor[obj.cid];
      var data;
      if (cons) {
        data = cons(obj.data);
      } else {
        data = obj.data;
      }
      event.emit(obj.name, data);
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


  function send(name, data, constructor_id) {
    if (constructor_id) {
      if (constructor_id < 0 || constructor_id >= type_constructor.length)
        throw new Error('bad constructor id ' + constructor_id);

      if (warp.CONSTRUCTORS[constructor_id] >= 0) {
        constructor_id = warp.CONSTRUCTORS[constructor_id];
      } else {
        throw new Error('bad constructor id ' + constructor_id);
      }
    }
    thread_context._send(JSON.stringify({
      name : name,
      data : data,
      cid  : constructor_id,
    }));
    return warp;
  }


  function send_error(err) {
    send('error', {
      name    : err.name,
      code    : err.code,
      message : err.message,
      stack   : err.stack,
    }, 'Error');
    return warp;
  }


  function emit(name, data) {
    event.emit.apply(event, arguments);
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


  function _error_constructor(d) {
    var ObjNew = this[d.name];
    var r = new ObjNew(d.message);
    r.stack = d.stack;
    r.name  = d.name;
    return r;
  }
}
