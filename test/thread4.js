
// 兼容 nodejs
if (!thread) {
  var thread = {
    http : require('http')
  };
  console.test = console.log;
}
﻿
// thread.eval("");
// this.eval("");
// this.constructor.eval("")
console.log('console.log is success');
console.test('a', 'b', 'c', 'd', function(err, ret) {
  console.log('test call back.');
});

function code_err() {
  // (-)
}


thread.http.get('http://baidu.com', null, function(err, ret) {
  console.log('http get::', err, ret);
  thread.send('over');
});
