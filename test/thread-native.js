try { it; return; } catch(e) {}


process.on('beforeExit', function() {
  thread.send('beforeExit');
});
process.on('exit', function() {
  thread.send('exit0');
});
thread.on('over', function() {
  thread.offall();
});


//
// 通用测试工具
//
thread.on('eval_code', function(event_name) {
  // fn : Function(args, cb)
  thread.once(event_name, function(r) {
    try {
      if (r.debug) console.log('eval_code() start', event_name);
      var timers = require('timers');
      var _context = thread.create_context();
      _context.require = require;
      _context.thread  = thread;
      _context.console = console;
      _context.process = process;
      _context.setTimeout = timers.setTimeout;
      _context.setImmediate = timers.setImmediate;

      var fn = thread.eval('(' + r.code + ')', r.name, 0, _context);
      fn(r.args, function(err, ret) {
        thread.send(r.name, [ERR(err), ret]);
      });
    } catch(e) {
      thread.send(r.name, [ERR(e)]);
    }
  });
});


function ERR(e) {
  if (!e) return;
  return {
    name    : e.name,
    message : e.message,
    stack   : e.stack,
  };
}


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
