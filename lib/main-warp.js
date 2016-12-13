var Events        = require('events');
var fs            = require('fs');
var path          = require('path');
var wrap_context  = require('./context.js').wrap_context;


module.exports = warp;


var USE_SCRIPT_IDX = -1;
var LIB_SCRIPT_IDX = -1;
var thread_code_warp;
init();


function init() {
  var $USE_SCRIPT = -1;
  var $LIB_SCRIPT = -2;

  thread_code_warp = [
    "var exports;",
    CODE('/context.js'),
    CODE('/thread-warp.js'),
    $LIB_SCRIPT,
    "try {",
      "(function(thread, console) {",
        "var eval; // USER_SCRIPT_BEGIN",
        $USE_SCRIPT,
      "}).call(thread, thread, thread.console)",
    "} catch(err) {",
      "thread.send('error', { name: err.name, \
          stack: err.stack, message: err.message });",
    "}",
  ];

  for (var i=0; i<thread_code_warp.length; ++i) {
    if (thread_code_warp[i] === $USE_SCRIPT) {
      USE_SCRIPT_IDX = i;
    }
    if (thread_code_warp[i] === $LIB_SCRIPT) {
      LIB_SCRIPT_IDX = i;
    }
    if (LIB_SCRIPT_IDX >= 0 && USE_SCRIPT_IDX >= 0)
      break;
  }
}


function warp(native) {
  return {
    create    : create,
    v8version : native.v8version,
  };


  function create(code, filename, libs) {
    thread_code_warp[LIB_SCRIPT_IDX] = exports_libs_code(libs);
    thread_code_warp[USE_SCRIPT_IDX] = code;

    filename = path.normalize(filename);
    var main_context = native.create.call(native, thread_code_warp.join("\n"), filename);
    var event = new Events();
    var ret = wrap_context(main_context, event);

    ret.stop = function() {
      main_context._stop();
    };

    ret.use_time = function() {
      return main_context._use_time();
    };

    ret.notify = function(msg) {
      return main_context._notify(msg);
    };

    // call from c++
    main_context._throw_error = function(msg) {
      event.emit('error', msg);
    };

    bind_function_call(ret, libs);
    return ret;
  }


  function exports_libs_code(libs) {
    var ret = [];
    ret.push('\n\n');
    for (var namespace in libs) {
      for (var fname in libs[namespace]) {
        var lib = libs[namespace][fname];
        ret.push('__createFunctionProxy(');
        if (namespace) {
          ret.push('"');
          ret.push(namespace);
          ret.push('"');
        } else {
          ret.push('null');
        }
        ret.push(',"');
        ret.push(fname);
        ret.push('",');
        ret.push(lib.argc);
        ret.push(',');
        ret.push(lib.ret);
        ret.push(');\n');
      }
    }
    ret.push('\n\n');
    return ret.join('');
  }


  function bind_function_call(context, libs) {
    context.on('__direct_call_obj_func', function(data) {
      var _cb;

      if (data['rid'] > 0) {
        _cb = function(err, ret) {
          context.send('__function_back_call_' + data.rid, {
              err : err, ret : ret });
        };
      } else {
        _cb = function(err, ret) {
          console.log('FUNC RET:', err||'', ret||'');
        };
      }

      var ns = libs[data.ns];
      if (!ns) {
        return _cb('not hs namespace: ' + data.ns);
      }

      var conf = ns[ data.name ];
      if (!conf) {
        return _cb('not has lib config: ' + data.name);
      }

      var func = conf.fn;
      if (!func) {
        return _cb('config not has function: ' + data.ns + '::' + data.name);
      }

      try {
        data.args.length = data.len;
        func.call(context, data.args, _cb);
      } catch(_err) {
        _cb(_err);
      }
    });
  }
}


function CODE(file) {
  return fs.readFileSync(__dirname + file);
}
