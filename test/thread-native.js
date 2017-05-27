try { it; return; } catch(e) {}

//
// 模拟 node 环境
//
var native_fs = thread.binding('fs');
var _global   = {};
var _cache    = {};
var require   = _require;
var init_data = thread.wait('init_process');

var process = _global.process = {
  pid        : thread.threadId,
  _constants : init_data.constants,
  _natives   : init_data.natives,

  nextTick : function(fn, a, b, c) {
    var arg;
    switch(arguments.length) {
      case 1: arg = []; break;
      case 2: arg = [a]; break;
      case 3: arg = [a,b]; break;
      case 4: arg = [a,b,c]; break;
      default:
        arg = [];
        for (var i=1; i<arguments.length; ++i) {
          arg.push(arguments[i]);
        }
    }
    setImmediate(function() {
      try {
        fn.apply(null, arg);
      } catch(e) {
        thread.emit('error', e);
      }
    });
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
  console.log('THREAD', e);
});

var context = thread.create_context();
context.process = process;
context.global  = _global;
context.console = console;
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

  var code = process._natives[name];
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
_module_not_support('http');


var Module = require('module');
var MainModule = new Module('bootloader');
require = function(id) {
  try {
    return MainModule.require(id);
  } catch(e) {
    return _require(id);
  }
}

thread.send('ready');
//==============================================================================


thread.on('http.get()', function(url) {
  try {
    var http = require('http');
    var buffer = require('buffer').Buffer;
    var urllib = require('url');

    var urldata = urllib.parse(url);
    var req = http.request(urldata, function(resp) {
      var bufs = [];
      resp.on('data', function(d) {
        bufs.push(d);
      });
      resp.on('end', function() {
        var buf = buffer.concat(bufs);
        thread.send('http.get()', [null, buf]);
      });
      resp.on('error', function(e) {
        thread.send('http.get()', [ERR(e)]);
      });
    });

    req.on('error', function(e) {
      thread.send('http.get()', [ERR(e)]);
    });

    req.end();
  } catch(e) {
    thread.send('http.get()', [ERR(e)]);
  }
});


//
// 通用测试工具
//
thread.on('eval_code', function(event_name) {
  // fn : Function(args, cb)
  thread.once(event_name, function(r) {
    try {
      var context = thread.create_context();
      context.require = require;
      context.process = process;
      context.console = console;
      context.thread  = thread;
      context.setTimeout = setTimeout;

      var fn = thread.eval('(' + r.code + ')', r.name, 0, context);
      fn(r.args, function(err, ret) {
        thread.send(r.name, [ERR(err), ret]);
      });
    } catch(e) {
      thread.send(r.name, [ERR(e)]);
    }
  });
});
