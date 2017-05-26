describe('events from lib/events.js', function() {

var E       = require('../lib/events.js');
var assert  = require('assert');
var event   = new E();
var lisc    = 0; // 监听器数量, 手动设置

var d = [];
for (var i=0; i<10; ++i) {
  d.push(Math.random() + '');
}

it('on()', function(done) {
  event.on('a1', done);
  event.emit('a1');
  lisc += 1;
});


it('on() data', function(done) {
  event.on('a5', function(r) {
    assert.deepEqual(d, r);
    done();
  });
  event.emit('a5', d);
  lisc += 1;
});


it('once()', function(done) {
  event.once('a2', done);
  event.emit('a2');
  event.emit('a2');
});


it('once() data', function(done) {
  event.once('a6', function(r) {
    assert.deepEqual(d, r);
    done();
  });
  event.emit('a6', d);
  event.emit('a6', d);
});


it('removeListener()', function(done) {
  event.on('a3', function() {
    done(new Error('removeListener fail1'));
  });
  event.on('a3', function() {
    done(new Error('removeListener fail2'));
  });
  event.removeListener('a3');
  event.emit('a3');
  setTimeout(done, 300);
});


it('removeListener() Specified callback', function(done) {
  event.on('a7', e1);
  event.on('a7', e2);
  event.removeListener('a7', e1);
  event.emit('a7');
  lisc += 1;

  function e1() {
    done(new Error('removeListener fail'));
  }
  function e2() {
    done();
  }
});


it('mult on()', function(done) {
  var a4 = 0;
  event.on('a4', function() {
    a4+=1; _t();
  });
  event.on('a4', function() {
    a4+=10; _t();
  });
  event.on('a4', function() {
    a4+=100; _t();
  });
  event.emit('a4');
  lisc += 3;
  function _t() {
    if (a4 === 111) {
      done();
    }
  }
});


it('listenerCount()', function() {
  assert(event.listenerCount('a4') == 3, '"a4" listener count fail');
  assert(event.listenerCount() == lisc, 'all listener count fail');
});


it('removeAllListeners', function() {
  event.removeAllListeners();
  try {
    for (var i=1; i<=7; ++i) {
      event.emit('a'+i);
    }
  } catch(e) {
    throw new Error('remove fail');
  }
});


it('no listenerCount', function() {
  assert(event.listenerCount() ===0, 'listener count fail');
});

});
