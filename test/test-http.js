describe('Exports HTTP to thread', function() {

var fs        = require('fs');
var thlib     = require('../');
var deferred  = require('deferred');
var assert    = require('assert');

var fname = __dirname + '/thread-http.js';
var code  = fs.readFileSync(fname, 'utf8');
var url   = 'http://www.sogou.com/';


var right_body;
var dlib = thlib.default_lib;
dlib.http = http_proxy();


it('Main http() ' + url, function(done) {
  var thiz = this;
  dlib.http.get.fn([url, null], function(e, ret) {
    if (e) {
      done(e);
    } else {
      right_body = ret;
      done();
    }
  });
});


it('Thread http()', function(done) {
  var th = thlib.create(code, fname, dlib);
  th.send('url', url);

  th.on('error', function(e) {
    done(e);
  });

  th.on('end', function() {
  });

  th.on('over', function(ret) {
    if (ret.headers && ret.statusCode && ret.data === right_body.data) {
      done();
    } else {
      done(new Error('is not http return data'));
    }
  });
});


function http_proxy() {
  var http = require('http');

  return {
    get : {
      ret  : true,
      argc : 2,
      fn   : get,
    },
  };

  // http.get(url, data, callback)
  function get(args, next) {
    var url = args[0];
    var data = args[1];
    if (data) {
      data = querystring.stringify(data);
      var f = url.indexOf('?');
      if (f >= 0) {
        url += '&' + data;
      } else {
        url += '?' + data;
      }
    }

    http.get(url, function(res) {
      var cache = [];
      res.on('data', function (chunk) {
        cache.push(chunk);
      });
      res.on('end', function() {
        next(null, {
          headers    : res.headers,
          statusCode : res.statusCode,
          data       : Buffer.concat(cache).toString('utf8'),
        });
      });
    }).on('error', next);
  }
}

});
