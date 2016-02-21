
module.exports = {
  console : {
    log   : console_proxy('log'),
    info  : console_proxy('info'),
    warn  : console_proxy('warn'),
    error : console_proxy('error'),
    debug : console_proxy('log'),
    test  : test(),
  },
  http : http_proxy(),
};


function console_proxy(method) {
  return {
    ret  : false,
    argc : -1,
    fn   : fn,
  };

  function fn(args, next) {
    console[method].apply(console, args);
  }
}


function test() {
  return {
    ret  : true,
    argc : -1,
    fn   : function(args, next) {
      console.log('test call: ', args.length, args);
      next(null, 'ok');
    },
  };
}


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
