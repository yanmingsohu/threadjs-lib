describe('nodejs native module exports', function() {

var fs        = require('fs');
var thlib     = require('../');
var deferred  = require('deferred');
var assert    = require('assert');

var fname     = __dirname + '/thread-native.js';
var code      = fs.readFileSync(fname, 'utf8');


var th = thlib.create(code, fname, thlib.default_lib);
var result = deferred();
var SKIP = function() { return true };


function do_thread(event_name, send_data, check, __skip) {
  return it(event_name, function(done) {
    if (__skip && __skip(this)) return this.skip();
    var af = deferred();
    th.once(event_name, function(ret) {
      // console.log(event_name, ret, '%%')
      if (ret[0]) {
        return af.reject(ret[0]);
      }
      try {
        check(ret[1]);
        af.resolve();
      } catch(e) {
        af.reject(e);
      }
    });
    th.once('error', function(e) {
      af.reject(e);
    });
    th.send(event_name, send_data);
    af.promise(done, done);
  });
}


//
// 在主线程/工作线程中分别执行 fn 函数, 并比较计算结果
// fn : Function(args, cb)
//
function eval_code(event_name, args, fn) {
  var send_data = {
    name : event_name,
    code : fn.toString(),
    args : args,
  };
  var task, actual;
  it('@Prepare ' + event_name, function(done) {
    fn(args, function(err, ret) {
      if (err) {
        done(err);
      } else {
        actual = ret;
        th.send('eval_code', event_name);
        done();
      }
    });
  });
  task = do_thread(event_name, send_data, function(expected) {
    assert.deepEqual(actual, expected);
  }, function() {
    return !actual;
  });
}


th.on('error', function(e) {
  console.log(e);
  result.reject(e);
});


th.on('ready', function() {
  result.resolve();
});
it('ready', function(done) {
  result.promise(done, done);
});


describe('assert', function() {
  eval_code('assert.deepEqual()', process.versions, function(r, cb) {
    var v = process.versions;
    var assert = require('assert');
    assert.deepEqual(r, v);
    cb(null, v);
  });
});


describe('buffer', function() {
  var arr = [];
  for (var i=0; i<3e4; ++i) {
    arr.push(parseInt(Math.random() * 128));
  }
  var b = Buffer.from(arr);

  eval_code('buffer.concat()', b, function(_b, cb) {
    var Buffer = require('buffer').Buffer;
    var b = Buffer.from(_b);
    var c = Buffer.concat([b, b]);
    cb(null, JSON.stringify(c));
  });

  eval_code('buffer.write__()', b, function(b, cb) {
    var Buffer = require('buffer').Buffer;
    var b_ = Buffer.from(b);
    b_.write('abcde', 0);
    b_.writeDoubleBE(23846.473289, 10);
    b_.writeDoubleLE(29576.9171, 20);
    b_.writeFloatBE(812645.328497, 30);
    b_.writeFloatLE(278365.32894, 40);
    b_.writeInt8(73, 50);
    b_.writeInt16BE(27365, 60);
    b_.writeInt16LE(30375, 70);
    b_.writeInt32BE(374869473, 80)
    b_.writeInt32LE(3746608, 90)
    b_.writeIntBE(28956435, 100, 6)
    b_.writeIntLE(97465870, 110, 6)
    b_.writeUInt8(245, 120)
    b_.writeUInt16BE(60098, 130)
    b_.writeUInt16LE(29347, 140)
    b_.writeUInt32BE(292837556, 150)
    b_.writeUInt32LE(192837565, 160)
    b_.writeUIntBE(73518595, 170, 6)
    b_.writeUIntLE(10973426, 180, 6)
    // assert.deepEqual(Buffer.from(a), b_);
    cb(null, JSON.stringify(b_));
  });
});


describe('dns', function() {
  var host = 'qq.com';
  var dns = require('dns');
  var ip1;

  eval_code('dns.resolve()', host, function(host, cb) {
    var dns = require('dns');
    dns.resolve(host, function(err, ip) {
      if (ip) ip.sort();
      cb(err, ip);
    });
  });
});


describe('fs', function() {
  eval_code('fs.readFile()', fname, function(filename, cb) {
    var fs = require('fs');
    fs.readFile(filename, 'utf8', cb);
  });
});


describe('http', function() {
  var url = 'http://www.sogou.com/';
  var http = require('http');

  do_thread('http.get() - process shutdown !', url, function(buf) {
    console.log(buf)
  }, SKIP);
});


describe('crypto', function() {
  eval_code('crypto.createHmac()', 0, function(data, cb) {
    var crypto = require('crypto');
    var secret = 'abcdefg';
    var hash = crypto.createHmac('sha256', secret)
                       .update('I love cupcakes')
                       .digest('hex');
    cb(null, hash);
  });

  eval_code('crypto.Certificate()', 0, function(d, cb) {
    const crypto = require('crypto');
    const cert1 = new crypto.Certificate();
    const cert2 = crypto.Certificate();
    cb(null, cert1 && cert2);
  });

  eval_code('crypto.createCipher()', 0, function(r, cb) {
    const crypto = require('crypto');
    const cipher = crypto.createCipher('aes192', 'a password');

    let encrypted = [];
    cipher.on('readable', () => {
      const data = cipher.read();
      if (data)
        encrypted.push(data.toString('hex'));
    });
    cipher.on('end', () => {
      cb(null, encrypted.join(''));
    });
    cipher.write('some clear text data');
    cipher.end();
  });

  eval_code('cipher.update() and cipher.final()',
    null, function(r, cb) {
      const crypto = require('crypto');
      const cipher = crypto.createCipher('aes192', 'a password');

      let encrypted = cipher.update('some clear text data', 'utf8', 'hex');
      encrypted += cipher.final('hex');
      cb(null, encrypted);
    });
});


});
