
module.exports = {
  console : {
    log   : console_proxy('log'),
    info  : console_proxy('info'),
    warn  : console_proxy('warn'),
    error : console_proxy('error'),
    debug : console_proxy('log'),
    test  : test(),
  },
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
