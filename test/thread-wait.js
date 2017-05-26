try { it; return; } catch(e) {}


// console.log('sub1 thread will wait `DEFAULT`');
thread.on('lock1', function(a) {
  var b = thread.wait();
  thread.send(b, [a, b]);
})
// console.log('sub1 thread restart, recv:', ret);

// console.log('sub2 thread will wait `NamedWait`');
thread.on('lock2', function(a) {
  var b = thread.wait('NamedWait', a);
  thread.send(b, [a, b]);
});
// console.log('sub2 thread restart, recv:', ret);
