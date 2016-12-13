
console.log('sub  thread will wait');
var ret = thread.wait();
console.log('sub  thread restart, recv:', ret);
