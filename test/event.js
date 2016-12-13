var E = require('../lib/events.js');

// ======================================================================
var event = new E();
event.on('a', a);
event.once('a', a);
event.on('b', b1);
event.on('b', b2);
event.removeListener('b');
event.on('b', b1);
event.emit('a', 'hi');
console.log(event);

function a(d) {
  console.log('recv a', d);
  event.emit('b', 'a.b');
}

function b1(d) {
  console.log('recv b1', d);
}

function b2() {
  console.log('recv b2');
}
