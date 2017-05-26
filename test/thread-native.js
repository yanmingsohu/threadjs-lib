try { it; return; } catch(e) {}

//
// 模拟 node 环境
//
var native_fs = thread.binding('fs');
var natives, constants;
var _global = {};
var _cache = {};
var ev = new EventEmitter();

var process = thread.process;
process.pid = thread.threadId;
process.nextTick = function(fn) {
  var arg = [];
  for (var i=1; i<arguments.length; ++i) {
    arg.push(arguments[i]);
  }
  setImmediate(function() {
    try {
      fn.apply(null, arg);
    } catch(e) {
      thread.emit('error', e);
    }
  });
};
for (var n in ev) {
  process[n] = ev[n];
}

process.binding = function(name) {
  // console.log('process::binding\t', name);
  if (name === 'constants') return constants;
  return thread.binding(name);
};
process.cwd = function() {
  return this._cwd;
};

function __none() {}

thread.on('error', function(e) {
  console.log('THREAD', e);
});

var context = thread.create_context();
context.process = process;
context.global  = _global;
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


function require(name) {
  var module = _cache[name];
  if (module)
    return module.exports;

  var code = natives[name];
  if (!code)
    throw new Error('module fail: "' + name + '"');

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
  var warp_code = [
    '(function(exports, require, module, __filename, __dirname) {\n',
    code,
    '\n})',
  ].join('');

  return thread.eval(warp_code, module.id, -1, context);
}


process.constants(function(err, _constants) {
  if (err) return thread.send('error', err.message);
  constants = _constants;

  process._attr_(function(err, ret) {
    if (err) return thread.send('error', err.message);
    for (var n in ret) {
      process[n] = ret[n];
    }

    process.natives(function(err, _natives) {
      if (err) return thread.send('error', err.message);
      natives = _natives;
      thread.send('ready');
    });
  });
});


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


//==============================================================================


thread.on('http.get()', function(url) {
  try {
    var http = require('http');
    var buffer = require('buffer').Buffer;

    var req = http.get(url, function(resp) {
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

      var fn = thread.eval('(' + r.code + ')', r.name, 0, context);
      fn(r.args, function(err, ret) {
        thread.send(r.name, [ERR(err), ret]);
      });
    } catch(e) {
      thread.send(r.name, [ERR(e)]);
    }
  });
});
