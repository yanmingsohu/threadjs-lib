try { it; return; } catch(e) {}

//
// 模拟 node 环境
//
var native_fs = thread.binding('fs');
var _global   = {};
var _cache    = {};
var require   = _require;
var init_data = thread.wait('init_process');
var tick_que  = [];

var process = _global.process = {
  pid        : thread.threadId,
  _constants : init_data.constants,
  _natives   : init_data.natives,

  nextTick : function(fn, a, b, c) {
    var arg = [];
    for (var i=1; i<arguments.length; ++i) {
      arg.push(arguments[i]);
    }

    if (tick_que.length == 0) {
      _next_tick(function() {
        while (tick_que.length > 0) {
          tick_que.shift()();
        }
        thread.runMicrotasks();
      });
    }

    tick_que.push(function() {
      try {
        fn.apply(null, arg);
      } catch(e) {
        // console.log('[nextTick]', e, fn.toString());
        process.emit('error', e);
      }
    });
  },

  // 解释: https://zhuanlan.zhihu.com/p/26071124,
  //      https://www.zhihu.com/question/36972010
  // 用 internal/process/next_tick 初始化
  _setupNextTick: function(_tickCallback, _runMicrotasks) {
    delete process._setupNextTick;
    var kIndex = 0;
    var kLength = 1;
    var tickInfo = [0, 0];
    var runMicrotasks = {
      // !! cpp 实现 runMicrotasks()
      runMicrotasks : thread.runMicrotasks
    };
    console.log('#_setupNextTick()');
    return tickInfo;
  },

  _promiseRejectEvent : {
    'unhandled' : 0, // v8::kPromiseRejectWithNoHandler
    'handled'   : 1, // v8::kPromiseHandlerAddedAfterReject
  },

  _setupPromises: function(fn) {
  },

  binding : function(name) {
    // console.log('process::binding\t', name);
    if (name === 'constants') return this._constants;
    return thread.binding(name);
  },

  cwd : function() {
    return this._cwd;
  },

  emitWarning : function(warning, name, ctor) {
    if (!name) name = 'Warning';
    var e;
    if (typeof warning === 'string') {
      e = {
        name     : name,
        message  : warning,
        toString : function() {
          return '(Threadjs:' +process.pid+ ') ' + name + ': ' + warning;
        },
      };
      Error.captureStackTrace(e, ctor);
    } else {
      e = warning;
    }
    console.log(e.toString());

    setImmediate(function() {
      process.emit('warning', e);
    });
  },
};

Extends(init_data.attrs, process);
Extends(new EventEmitter(), process);

function __none() {}

thread.on('error', function(e) {
  // console cannot print Error object right.
  console.log('THREAD', e.name, e.stack);
});

var context = thread.create_context();
context.process = process;
context.global  = _global;
context.console = console;
context.setTimeout = setTimeout;
context.setImmediate = setImmediate;
context.DTRACE_NET_SERVER_CONNECTION = __none;
context.DTRACE_NET_STREAM_END = __none;
context.DTRACE_HTTP_SERVER_REQUEST = __none;
context.DTRACE_HTTP_SERVER_RESPONSE = __none;
context.DTRACE_HTTP_CLIENT_REQUEST = __none;
context.DTRACE_HTTP_CLIENT_RESPONSE = __none;
context.COUNTER_NET_SERVER_CONNECTION = __none;
context.COUNTER_NET_SERVER_CONNECTION_CLOSE = __none;
context.COUNTER_HTTP_SERVER_REQUEST = __none;
context.COUNTER_HTTP_SERVER_RESPONSE = __none;
context.COUNTER_HTTP_CLIENT_REQUEST = __none;
context.COUNTER_HTTP_CLIENT_RESPONSE = __none;


var NativeModuleTemplate = {
  _source : process._natives,
  _cache  : _cache,
  require : _require,

  wrapper : [
    '(function (exports, require, module, __filename, __dirname) { ',
    '\n});'
  ],

  wrap : function(script) {
    return NativeModule.wrapper[0] + script + NativeModule.wrapper[1];
  },

  getCached : function(id) {
    return _cache[id];
  },

  exists : function(id) {
    return init_data.natives.hasOwnProperty(id);
  },

  nonInternalExists : function(id) {
    return this.exists(id) && !this.isInternal(id);
  },

  isInternal : function(id) {
    return id.startsWith('internal/');
  },

  getSource : function(id) {
    return init_data.natives[id];
  },
};

function NativeModule(id) {
  this.filename = `${id}.js`;
  this.id = id;
  this.exports = {};
  this.loaded = false;
  this.loading = false;
}
Extends(NativeModuleTemplate, NativeModule);
NativeModule.exports = _cache['native_module'] = NativeModule;
NativeModule.prototype.compile = function() {
  throw new Error('no support');
};
NativeModule.prototype.cache = function() {
  throw new Error('no support');
};


function _require(name) {
  var module = _cache[name];
  if (module)
    return module.exports;

  // console.log('???', name)
  // var code = process._natives[name];
  var code = thread.wait('_require_file_', name);
  if (!code)
    throw new Error('module not found "' + name + '"');

  // console.debug('require::native \t', name);
  module = {
    exports  : {},
    cache    : _cache,
    id       : '[native::' + name + ']',
  };

  var init_fn = run_script(code, module);
  _cache[name] = module;

  init_fn.call(context,
      module.exports, require, module, name, process.cwd());

  return module.exports;
};


function run_script(code, module) {
  var warp_code = NativeModule.wrap(code);
  return thread.eval(warp_code, module.id, 0, context);
}


function ERR(e) {
  if (!e) return;
  else {
    return {
      name : e.name,
      stack : e.stack,
      message : e.message,
    }
  }
}


function Extends(recv, target) {
  for (var n in recv) {
    if (target[n]) console.log('WARN: target.', n, 'is exists');
    target[n] = recv[n];
  }
}


function _module_not_support(name) {
  process._natives[name]
    = "throw new ReferenceError('module not support:`"+name+"`')";
}


//
// 这些模块要么导致进程崩溃, 要么无法使用
//
// _module_not_support('http');


var Module = require('module');
var MainModule = new Module('bootloader');
require = function(id) {
  try {
    return MainModule.require(id);
  } catch(e) {
    return _require(id);
  }
}
// require('internal/process/next_tick').setup();
thread.send('ready');
//==============================================================================


//
// 通用测试工具
//
thread.on('eval_code', function(event_name) {
  // fn : Function(args, cb)
  thread.once(event_name, function(r) {
    try {
      if (r.debug) console.log('eval_code() start', event_name);
      var _context = thread.create_context();
      _context.require = require;
      _context.thread  = thread;
      for (var n in context) {
        _context[n] = context[n];
      }

      var fn = thread.eval('(' + r.code + ')', r.name, 0, _context);
      fn(r.args, function(err, ret) {
        thread.send(r.name, [ERR(err), ret]);
      });
    } catch(e) {
      thread.send(r.name, [ERR(e)]);
    }
  });
});


// setInterval(function() {
//   console.log('#Thread.2');
// }, 1000);
// thread.on('interval', function() {
//   console.log('#interval.3');
// });
//
// process.nextTick(function() {
//   var p = require('process');
//   require('assert')(p === process, 'not process');
// });
