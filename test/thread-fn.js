try { it; return; } catch(e) {}


function remove_all() {
  thread.offall();
}

function remove_all_but_timeout() {
  thread.offall();
  setTimeout(function() {
    thread.send('timeout');
  }, 1000);
}

function remove_some() {
  thread.off('remove_all');
  thread.off('remove_some');
  thread.on('remove_some', remove_some);
}

thread.on('remove_all', remove_all);
thread.on('remove_some', remove_some);
thread.on('remove_all_but_timeout', remove_all_but_timeout);
// console.log('hi')

if (!eval) {
  throw new Error('! fail: eval');
}
if (!EventEmitter) {
  throw new Error('! fail: not has EventEmitter');
}
