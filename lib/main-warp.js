var Events        = require('events');
var fs            = require('fs');
var path          = require('path');
var parsecode     = require('./parse.js');
var wrap_context  = require('./context.js').wrap_context;


module.exports = warp;


var template = CODE('./thread-warp.js');
var context  = CODE('./context.js');
var fnProxy  = CODE('./fn-proxy.js');
var events   = CODE('./events.js');

var thread_code_warp = parsecode(template, {
  context     : context,
  fnProxy     : fnProxy,
  events      : events,
  LIB_SCRIPT  : null,
  USE_SCRIPT  : null,
});


function CODE(file) {
  return fs.readFileSync(__dirname + '/' + file, 'UTF8');
}


function warp(native) {
  return {
    create    : create,
    v8version : native.v8version,
  };


  function create(code, filename, libs) {
    thread_code_warp.set('LIB_SCRIPT', exports_libs_code(libs));
    thread_code_warp.set('USE_SCRIPT', code);

    filename         = path.normalize(filename);
    var main_context = native.create(thread_code_warp.code(), filename);
    var event        = new Events();
    var ret          = wrap_context(main_context, event);
    var _is_running  = true;

    ret.stop = function() {
      main_context._stop();
    };

    ret.use_time = function() {
      return main_context._use_time();
    };

    ret.notify = function(msg) {
      if (msg) {
        msg = JSON.stringify(msg);
      }
      return main_context._notify(msg);
    };

    ret.is_running = function() {
      return _is_running;
    };

    ret.on('end', function() {
      _is_running = false;
    });

    // call from c++
    main_context._throw_error = function(msg) {
      event.emit('error', new Error(msg));
    };

    bind_function_call(ret, libs);
    return ret;
  }


  //
  // 封装了对 __createFunctionProxy 的调用
  //
  function exports_libs_code(libs) {
    var ret = [];
    ret.push('\n\n');

    for (var namespace in libs) {
      for (var fname in libs[namespace]) {
        var lib = libs[namespace][fname];
        if (isNaN(lib.argc))
          throw new Error('argc must number');

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
        ret.push(Boolean(lib.ret));
        ret.push(',');
        ret.push(Boolean(lib.mult));
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
