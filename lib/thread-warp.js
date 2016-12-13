// `import context.js, exports:
//    Function wrap_context(...)


//
// c++ export to use script
//
var thread;
//
// 调用该方法为 thread 绑定
// call from lib/main-warp.js
//
var __createFunctionProxy;
this.eval = null;


//
// thread_context 是 c++ 导出的对象, 不可暴露给用户脚本
// 2016 第一行代码, 函数返回后, 将导出库绑定在 thread 上
// c++: do_script(void *arg) -> j_context
//
(function(thread_context) {

var event_handles = {};
var id = 0;

//
// call from c++
//
thread_context.noListener = function() {
  var c;
  for (var n in event_handles) {
    var h = event_handles[n];
    if (h.s) {
      c = true;
      break;
    }
  }
  return !c;
};


//
// 模拟一个 Event 库的实现
//
var event = {
  on: function(name, cb, _remove) {
    var dat = {
      cb     : cb,
      next   : null,
      remove : _remove,
    };
    if (!event_handles[name]) {
      event_handles[name] = { s: dat, e: dat };
    } else {
      if (event_handles[name].e) {
        event_handles[name].e.next = dat;
        event_handles[name].e = dat;
      } else {
        event_handles[name].e = event_handles[name].s = dat;
      }
    }
    return event;
  },

  once: function(name, cb) {
    return event.on(name, cb, true);
  },

  _iterator : function(name, cb) {
    var p, h = event_handles[name].s;
    var rm;

    while (h) {
      cb(h, p, _remove);
      if (!rm) {
        p = h;
      } else {
        rm = false;
      }
      h = h.next;
    }

    function _remove(h, p) {
      if (h === event_handles[name].s) {
        event_handles[name].s = h.next;
      }
      if (h === event_handles[name].e) {
        event_handles[name].e = p;
      }
      if (p) {
        p.next == h.next;
      }
      rm = true;
    }
  },

  removeListener: function(name, cb) {
    if (!event_handles[name]) return;
    if (cb) {
      event._iterator(name, function(h, p, _remove) {
        if (h.cb === cb) {
          _remove(h, p);
        }
      });
    } else {
      event._iterator(name, function(h, p, _remove) {
        _remove(h, p);
      });
    }

    return event;
  },

  emit: function(name, data) {
    if (!event_handles[name]) return;
    event._iterator(name, function(h, p, _remove) {
      try {
        h.cb(data);
      } catch(err) {
        thread.send('error', err);
      }
      if (h.remove) {
        _remove(h);
      }
    });
    return event;
  },

  removeAllListeners: function() {
    event_handles = {};
  },
};

//
// thread_context 包装为 thread 导出给用户脚本
//
thread = wrap_context(thread_context, event);
__createFunctionProxy = createFunctionProxy;


function createFunctionProxy(namespace, name, argc, has_ret) {
  var bind = thread;
  if (namespace) {
    bind = thread[namespace];
    if (!bind) {
      bind = thread[namespace] = {};
    }
  }
  if (bind[name]) {
    bind.send('warn', 'function replased:' + name);
  }

  if (argc >=0 && has_ret) {
    argc += 1;
  }

  bind[name] = function() {
    if(argc >=0 && argc != arguments.length) {
      throw new Error('must ' + argc + ' arguments');
    }
    var retid = 0;
    var len = arguments.length;

    if (has_ret) {
      --len;
      var _cb = arguments[len];
      if (typeof _cb !== 'function') {
        throw new Error('last arg must function');
      }
      delete arguments[len];
      retid = ++id;

      thread.once('__function_back_call_' + retid, function(data) {
        _cb(data.err, data.ret);
      });
    }

    thread.send('__direct_call_obj_func', {
      ns   : namespace,
      name : name,
      args : arguments,
      len  : len,
      rid  : retid,
    });
  };
}

// 保护 globe -> this 不被用户代码访问
})(this);

/*
__createFunctionProxy([main function name], [args len], [has call back])
*/

/*
// User Script is warp in `Function`
(function(thread,  ...) {
  var _stop, _recv, _send;
  ..... User Script here ...
}).call(thread, thread ...);
*/
