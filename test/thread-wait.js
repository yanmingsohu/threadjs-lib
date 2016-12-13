

console.log('sub  thread will wait');
var ret = thread.wait();
console.log('sub  thread restart, recv:', ret);

console.log();
if (thread.eval('this')) {
  throw new Error('! must null thread.eval');
}
if (eval) {
  throw new Error('! must null eval');
}
console.log(this);
