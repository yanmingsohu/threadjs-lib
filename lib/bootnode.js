//
// 返回 getter 的包装器
//
function createFilter(getter) {
  var _filters = [];


  var fwarp = function(name) {
    if (_filters.length > 0) {
      for (var i=0, e=_filters.length; i<e; ++i) {
        if (_filters[i](name))
          throw new Error('deter `' + name + '` module');
      }
    }
    return getter.apply(null, arguments);
  };

  fwarp.add_filter    = add_filter;
  fwarp.remove_filter = remove_filter;

  return fwarp;


  function add_filter(filter) {
    var i = _find_filter(filter);
    if (isNaN(i)) {
      return _filters.push(filter)-1;
    }
  }


  function remove_filter(filter) {
    var i = _find_filter(filter);
    if (!isNaN(i)) {
      _filters.splice(i, 1);
      return i;
    }
  }


  function _find_filter(filter) {
    for (var i=_filters.length-1; i>=0; --i) {
      if (_filters[i] === filter) {
        return i;
      }
    }
  }
}


var ready = 'thread_ready';


//
// 该方法通过 threadjs 加载并运行, 晚于 on_node_loader
//
function on_thread_loader() {
  thread.createFilter = createFilter;
  process.thread = thread;
  process.emit(ready);
  process.on('uncaughtException', function(e) {
    thread.send_error(e);
  });
}


//
// 该方法被 node 加载并运行, 有完整的 node lib
//
function on_node_loader() {
  var Module = require('module');

  process.once(ready, function() {
    var thread = process.thread;
    thread.send(ready);

    thread.once('eval_code', function(r) {
      try {
        var main = new Module(r.file);
        main._compile(r.code, r.file);
        main.paths = Module._nodeModulePaths(__dirname)
                     .concat(Module.globalPaths);
        main.filename = r.file;
      } catch(e) {
        process.emit('uncaughtException', e);
      }
      thread.send('code_running');
    });
  });
}


try {
  if (thread.threadId)
    on_thread_loader();
} catch(e) {
}


try {
  if (require && module)
    on_node_loader();
} catch(e) {
}
