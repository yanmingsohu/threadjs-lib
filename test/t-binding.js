describe('Native binding from nodejs lib', function() {

var fs        = require('fs');
var thlib     = require('../');
var deferred  = require('deferred');
var assert    = require('assert');


var fname = __dirname + '/thread-bind.js';
var code = fs.readFileSync(fname, 'utf8');
var skip_module = {
  'natives':1, 'constants':1,
};


var th = thlib.create(code, fname, thlib.default_lib);


process.moduleLoadList.forEach(function(name) {
  var prefix = 'Binding ';
  if (name.indexOf(prefix) == 0) {
    var mod = name.substr(prefix.length);
    if (skip_module[mod]) return;

    it('binding "' + mod + '" module', function(done) {
      testBindModule(mod, done);
    });
  }
});


var af = deferred();
th.on('add_filter_over', function() {
  af.resolve();
});
it('add filter', function(done) {
  th.send('add_filter', 'uv');
  af.promise(done, done);
});


it('deter! nv module', function(done) {
  th.send('bind_mod', 'uv');
  th.on('mod-uv', function(r) {
    if (!r.error) {
      done(new Error('must deter "uv" module'));
    } else {
      var m = r.error.message;
      if (m.indexOf('uv') >= 0 && m.indexOf('deter') >= 0) {
        done();
      } else {
        done(new Error('bad message:' + m));
      }
    }
  });
});


function testBindModule(modn, done) {
  th.once('mod-' + modn, function(ret) {
    if (ret.data) {
      try {
        assert.deepEqual(getNativeModInfo(modn),
          ret.data, 'native module `' + modn + '` binding fail.');
        done();
      } catch(e) {
        done(e);
      }
    } else if (ret.error) {
      done(new Error(ret.error.message));
    } else {
      done(new Error('unknow'));
    }
  });
  th.send('bind_mod', modn);
}


function getNativeModInfo(mn) {
  var b = process.binding(mn);
  var info = {};
  for (var n in b) {
    info[n] = typeof b[n];
  }
  if (mn == 'constants') console.log(info)
  return info;
}


var e2 = deferred();
th.on('error', function(e) {
  e2.reject(e);
});
th.on('end', function() {
  e2.resolve();
});
it('thread closed', function(done) {
  e2.promise(done, done);
  th.send('over');
});

});
