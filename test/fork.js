try { it; return; } catch(e) {}

process.on('message', function(m) {
  m.child_pid = process.pid;
  process.send(m);
  process.removeAllListeners();
});
