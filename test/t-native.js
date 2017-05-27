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
var ready = false;


th.on('init_process', function() {
  var init_data = {
    constants : process.binding("constants"),
    natives   : process.binding("natives"),
    attrs     : {
      arch      : process.arch,
      platform  : process.platform,
      env       : process.env,
      execPath  : process.execPath,
      versions  : process.versions,
      release   : process.release,
      execArgv  : process.execArgv,
      _cwd      : process.cwd(),
    },
  };
  th.notify(init_data);
});


function do_thread(event_name, send_data, check, __skip) {
  return it(event_name, function(done) {
    if (__skip && __skip(this)) this.skip();
    if (!ready) this.skip();

    var af = deferred();
    th.once(event_name, function(ret) {
      // console.log(event_name, ret, '%%')
      if (ret[0]) {
        var e = new Error();
        for (var n in ret[0]) {
          e[n] = ret[0][n];
        }
        return af.reject(e);
      }
      try {
        check(ret[1]);
        af.resolve();
      } catch(e) {
        af.reject(e);
      }
      th.off('error', _got_error);
    });
    th.once('error', _got_error);
    th.send(event_name, send_data);
    af.promise(done, done);

    function _got_error(e) {
      af.reject(e);
    }
  });
}


//
// 在主线程/工作线程中分别执行 fn 函数, 并比较计算结果
// fn : Function(args, cb)
//
function eval_code(event_name, args, fn, tfn) {
  var send_data = {
    name : event_name,
    code : (tfn || fn).toString(),
    args : args,
  };
  var actual;
  var af = deferred();
  it('    Prepare', function(done) {
    if (!ready) this.skip();

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
  return do_thread(event_name, send_data, function(expected) {
    assert.deepEqual(actual, expected);
  }, function() {
    return !actual;
  });
}


th.on('error', function(e) {
  // console.log(e);
  result.reject(e);
});


th.on('ready', function() {
  ready = true;
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
  var host = 'google.com';
  var dns = require('dns');
  var ip = {};
  // 同一个 ip 有多个 host 会让测试失败.
  this.retries(4);

  dns.resolve(host, function(err, _ip) {
    ip.ip = _ip[0];
  });

  eval_code('resolve()', host, function(host, cb) {
    var dns = require('dns');
    dns.resolve(host, function(err, ip) {
      if (ip) ip.sort();
      cb(err, ip);
    });
  });

  eval_code('resolve()', ip, function(ip, cb) {
    var dns = require('dns');
    dns.reverse(ip.ip, cb);
  });
});


describe('fs', function() {
  eval_code('readFile()', fname, function(filename, cb) {
    var fs = require('fs');
    fs.readFile(filename, 'utf8', cb);
  });
});


describe('http', function() {
  var url = 'http://www.sogou.com/';
  var http = require('http');
  var crypto = require('crypto');
  var body = crypto.randomBytes(3000).toString('base64');

  do_thread('get()', url, function(buf) {
    console.log(buf)
  }, SKIP);
});


describe('crypto', function() {
  eval_code('createHmac()', 0, function(data, cb) {
    var crypto = require('crypto');
    var secret = 'abcdefg';
    var hash = crypto.createHmac('sha256', secret)
                       .update('I love cupcakes')
                       .digest('hex');
    cb(null, hash);
  });

  eval_code('Certificate()', 0, function(d, cb) {
    const crypto = require('crypto');
    const cert1 = new crypto.Certificate();
    const cert2 = crypto.Certificate();
    cb(null, cert1 && cert2);
  });

  eval_code('createCipher()', 0, function(r, cb) {
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


describe('url', function() {
  var url = require("url");
  var urls = 'https://a.b.c:9099/e/f/x?t=1&c=2';
  var uobj = url.parse(urls, true);

  eval_code('parse()', urls, function(urls, cb) {
    var url = require("url");
    var d = url.parse(urls, true);
    cb(null, d);
  });

  eval_code('format()', uobj, function(uobj, cb) {
    var url = require('url');
    var d = url.format(uobj);
    cb(null, d);
  });

  eval_code('resolve()', 0, function(_, cb) {
    var url = require('url');
    cb(null, [
      url.resolve('/one/two/three', 'four'),
      url.resolve('http://example.com/', '/one'),
      url.resolve('http://example.com/one', '/two'),
    ]);
  });
});


describe('util', function() {
  eval_code('format()', 0, function(_, cb) {
    var util = require('util');
    cb(null, [
      util.format('%s:%s', 'foo'),
      util.format('%s:%s', 'foo', 'bar', 'baz'),
      util.format(1, 2, 3),
    ]);
  });

  eval_code('inspect()', 0, function(_, cb) {
    var util = require('util');
    cb(null, [
      util.inspect({}, { showHidden: true, depth: null }),
      util.inspect.custom.toString(),
    ]);
  });

  eval_code('deprecate()', 0, function(_, cb) {
    const util = require('util');
    var puts_call = 0, warn_call = 0;
    var puts = util.deprecate(function() {
      ++puts_call;
    }, '函数调用时的警告, 每线程打印一次');
    puts(1,2,3);
    puts(1,2,3);

    process.on('warning', function(e) {
      ++warn_call;
      if (puts_call != 2 && warn_call != 1)
        return cb(new Error('bad'));

      cb(null, e.message);
    });
  });
});


describe('zlib', function() {
  eval_code('deflate()', 0, function(_, cb) {
    var zlib = require('zlib');
    const input = '.................................';
    zlib.deflate(input, function(err, buf) {
      if (err) return cb(err);
      cb(null, buf.toString('hex'));
    });
  });

  eval_code('unzip()', 0, function(_, cb) {
    var zlib = require('zlib');
    var Buffer = require('buffer').Buffer;
    const buffer = Buffer.from('eJzT0yMAAGTvBe8=', 'base64');
    zlib.unzip(buffer, (err, buf) => {
      if (err) return cb(err);
      cb(null, buf.toString('hex'));
    });
  });
});


describe('os', function() {
  eval_code('attributes', 0, function(_, cb) {
    var os = require('os');
    cb(null, [
      os.EOL, os.platform(), os.arch(), os.release(),
      os.type(), os.constants
    ]);
  });

  eval_code('cpus()', 0, function(_, cb) {
    var os = require('os');
    cb(null, os.cpus()[0].model);
  });
});


describe('child_process', function() {
  eval_code('exec()', 'ls', function(cmd, cb) {
    const exec = require('child_process').exec;
    exec('ls', cb);
  });

  var file = __dirname + '/fork.js';
  eval_code('fork()', file, function(file, cb) {
    const assert = require('assert');
    const fork = require('child_process').fork;
    var child = fork(file);
    child.send({ main_pid: process.pid });

    child.on('message', function(m) {
      try {
        assert(m.main_pid == process.pid);
        assert(m.child_pid == child.pid);
        cb(null, 1);
      } catch(e) {
        cb(e);
      }
    });
  });
});


describe('dgram', function() {
  var crypto = require('crypto');

  var d = {
    msg  : crypto.randomBytes(3000).toString('base64'),
    port : parseInt(10000 * Math.random() + 20000),
    thread_server : true,
  };
  it('thread is client', function(done) {
    server(d, function(err, ret) {
      if (err) return done(err);
      try {
        assert(ret === d.msg);
        done();
      } catch(e) {
        done(e);
      }
    });
    // client 返回什么不重要
    var name = 'createUdpSever';
    th.send('eval_code', name);
    th.send(name, {
      name : name,
      code : client.toString(),
      args : d,
    });
  });


  var d2 = {
    msg  : crypto.randomBytes(3000).toString('base64'),
    port : parseInt(10000 * Math.random() + 20000),
    thread_server : false,
  };
  it.skip('thread is server', function(done) {
    // this.timeout(15e3)
    th.once('udpserverbind', function() {
      // console.log('start client');
      client(d2, function(e) {
        if (e) done(e);
      });
    });
    var name = 'createUdpClient';
    th.send('eval_code', name);
    th.send(name, {
      name : name,
      code : server.toString(),
      args : d2,
    });
    th.once(name, function(ret) {
      // console.log(ret, '###########')
      if (ret[0]) return done(ret[0]);
      try {
        assert(ret[1] === d.msg);
        done();
      } catch(e) {
        done(e);
      }
    });
  });


  function server(d, cb) {
    const dgram = require('dgram');
    const Buffer = require('buffer').Buffer;
    const server = dgram.createSocket('udp4');
    server.on('error', (err) => {
      cb(err);
      server.close();
    });
    server.on('message', (msg, rinfo) => {
      cb(null, msg.toString());
      // console.log('server recv');
      server.close();
    });
    server.bind(d.port, function() {
      try {
        // console.log('server bind ok');
        thread.send('udpserverbind');
      } catch(e) {}
    });
  }

  function client(d, cb) {
    const dgram = require('dgram');
    const Buffer = require('buffer').Buffer;
    const message = Buffer.from(d.msg);
    const client = dgram.createSocket('udp4');

    // console.log('client begin send')
    client.send(message, d.port, '127.0.0.1', (err) => {
      if (err) cb(err);
      else cb(null, message.toString());
      client.close();
      // console.log('client send');
    });
  }
});


describe.skip('net', function() {
  var crypto = require('crypto');
  var d = {
    msg  : crypto.randomBytes(3000).toString('base64'),
    port : parseInt(10000 * Math.random() + 20000),
    thread_server : true,
  };
  eval_code('thread is server', d, test);

  var d2 = {
    msg  : crypto.randomBytes(3000).toString('base64'),
    port : parseInt(10000 * Math.random() + 20000),
    thread_server : false,
  };
  eval_code('thread is client', d2, test);

  function server() {
    const server = net.createServer((socket) => {
      socket.end(d.msg);
      cb(null, d.msg);
      server.close();
    }).on('error', (err) => {
      cb(err);
    });

    server.listen(d.port);
  }

  function client() {
    var bufs = [];
    const client = net.createConnection(d, () => {
      //'connect' listener
      console.log('connected to server!');
      client.write('world!\r\n');
    });
    client.on('data', (data) => {
      bufs.push(data);
    });
    client.on('end', () => {
      var msg = Buffer.concat(bufs).toString();
      client.end();
      cb(null, msg);
    });
    client.on('error', cb);
  }
});


});
