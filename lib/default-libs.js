
module.exports = {
  console : {
    log   : console_proxy('log'),
    info  : console_proxy('info'),
    warn  : console_proxy('warn'),
    error : console_proxy('error'),
    debug : console_proxy('log'),
    test  : test(),
  },

  process : {
    natives : {
      ret  : true,
      argc : 0,
      fn   : _natives,
    },
    constants : {
      ret  : true,
      argc : 0,
      fn   : _constants,
    },
    _attr_ : {
      ret  : true,
      argc : 0,
      fn   : process_attr,
    }
  },
};


function process_attr(args, next) {
  try {
    next(null, {
      env       : process.env,
      versions  : process.versions,
      release   : process.release,
      _cwd      : process.cwd(),
    });
  } catch(e) {
    next(e);
  }
}


function _constants(args, next) {
  try {
    var constants = process.binding("constants");
    next(null, constants);
  } catch(e) {
    next(e);
  }
}

function _natives(args, next) {
  try {
    var natives = process.binding("natives");
    next(null, natives);
  } catch(e) {
    next(e);
  }
}


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
