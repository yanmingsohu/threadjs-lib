describe('code template & thread-warp.js', function() {

var deferred  = require('deferred');
var assert    = require('assert');
var parse     = require('../').code_template;
var fs        = require('fs');
var vm        = require('vm');

var code = fs.readFileSync(__dirname + '/../lib/thread-warp.js', 'utf8');


var r = parse(code, {
  context : '"wrap_context"',
  events  : '"EventEmitter"',
  fnProxy : '"__createFunctionProxy"',
});

it('set()', function() {
  r.set('LIB_SCRIPT', '// __createFunctionProxy(.....)');
  r.set('USE_SCRIPT', 'console.log("ok"); throw new Error("test")');
});

var warp_created    = deferred();
var console_success = deferred();
var send_called     = deferred();
var context;

it('create context', function() {
  context = vm.createContext({
    EventEmitter : require('events'),
    wrap_context : wrap_context,
  });
});


it('run code from template', function() {
  vm.runInContext(r.code(), context, {
    filename : 'thread-warp.js',
  });
});


it('warp context created', function(done) {
  warp_created.promise(done, done);
});


it('console.log()', function(done) {
  console_success.promise(done, done);
});


it('thread.send() error', function(done) {
  send_called.promise(done, done);
});


function wrap_context() {
  warp_created.resolve();
  return {
    send: function(name, data) {
      if (name === 'error', data.message === 'test') {
        send_called.resolve();
      } else {
        send_called.reject(new Error(data.message));
      }
    },
    console : {
      log: function(d) {
        try {
          assert(d === 'ok');
          console_success.resolve();
        } catch(e) {
          console_success.reject(e);
        }
      },
    },
  };
}

});
