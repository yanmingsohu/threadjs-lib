try { it; return; } catch(e) {}

//
// 模拟 node 环境
//
var native_fs = thread.binding('fs');
var natives, constants, global = {};
var _cache = {};
var ev = new EventEmitter();

process = thread.process;
process.pid = thread.threadId;
process.nextTick = function(fn) {
  setTimeout(fn, 0);
};
for (var n in ev) {
  process[n] = ev[n];
}

process.binding = function(name) {
  if (name === 'constants') return constants;
  return thread.binding(name);
};
process.cwd = function() {
  return this._cwd;
};
// 无效的写法
// process.on('uncaughtException', (err) => {
//   console.log('uncaughtException', err.stack);
// });


var require = function(name) {
  var module = _cache[name];
  if (module)
    return module.exports;

  var code = natives[name];
  if (!code)
    throw new Error('module fail: "' + name + '"');

  module = {
    exports : {},
    cache : _cache,
  };

  // !! create_context() 效率太低
  var context = thread.create_context();
  context.process = process;
  context.module  = module;
  context.require = require;
  context.exports = module.exports;
  context.global  = global;
  context.__dirname = process.cwd();
  _cache[name] = module;

  thread.eval(code, '[native ' + name + ']', 0, context);
  return module.exports;
};


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


thread.on('readfile', function(filename) {
  try {
    var fs = require('fs');
    var ret = fs.readFile(filename, 'utf8', function(err, ret) {
      if (err) thread.send('error', err.stack);
      else thread.send('file-ret', ret);
    });
  } catch(e) {
    thread.send('error', e.stack);
  }
});


thread.on('http-get', function(url) {
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
        thread.send('http-ret', 'yes');
      });
      resp.on('error', function(e) {
        thread.send('error', e.stack);
      });
    });

    req.on('error', function(e) {
      thread.send('error', e.stack);
    });
  } catch(e) {
    thread.send('error', e.stack);
  }
});
