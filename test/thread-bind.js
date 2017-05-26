try { it; return; } catch(e) {}


thread.on('add_filter', function(fname) {
  thread.add_bind_filter(function(name) {
    // console.log('### filter :', name)
    return name == fname;
  });
  thread.send('add_filter_over');
});


thread.on('bind_mod', function(name) {
  var ename = 'mod-' + name;
  var ret = {};
  try {
    var r = {};
    var o = thread.binding(name);
    for (var n in o) {
      r[n] = typeof o[n];
    }
    ret.data = r;
  } catch(e) {
    ret.error = {
      message : e.message,
      stack   : e.stack,
      name    : e.name,
    };
  }
  thread.send(ename, ret);
});


thread.on('over', function() {
  thread.offall();
});
