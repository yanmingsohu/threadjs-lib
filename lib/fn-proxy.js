var id = 0;

function __createFunctionProxy(namespace, name, argc, has_ret, _multiple) {
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

      var cFn = _multiple ? 'on' : 'once';
      var key = '__function_back_call_' + retid;
      thread[cFn](key, function(data) {
        _cb(data.err, data.ret, unbind);
      });

      function unbind() {
        thread.off(key);
      }
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
