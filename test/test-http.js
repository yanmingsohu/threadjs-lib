var fs = require('fs');
var thlib = require('../');
var fname = __dirname + '/thread-http.js';
var code = fs.readFileSync(fname, 'utf8');


var dlib = thlib.default_lib;

dlib.http = http_proxy();


module.exports.do = function(_over) {
  var th = thlib.create(code, fname, dlib);
  console.log('\n============== Start: HTTP function');

  th.on('error', function(e) {
    console.log('Thread error:', '\n\t', e.message, '\n\t', e.stack);
  });

  th.on('end', function() {
    console.log('success: thread function stop');
    _over && _over();
  });

  th.on('over', function() {
    //th.send('ok');
  })
};


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
