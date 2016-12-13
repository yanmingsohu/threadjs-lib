
module.exports = code_template;


function code_template(template, config) {
  var name_index = {};
  var parsedcode = [];

  if (!config) config = {};

  var ret = {
    set  : set,
    code : code,
  };
  parse();

  return ret;


  function set(name, val) {
    config[name] = val;
  }


  function code() {
    for (var n in name_index) {
      var c = config[n];
      if (!c) {
        throw new Error('模板中的变量未定义: ' + n);
      }
      var i = name_index[n];
      parsedcode[i] = config[n];
    }
    return parsedcode.join('');
  }


  function parse() {
    var c, state = 0;
    var be = 0;

    for (var i=0, e=template.length; i<e; ++i) {
      c = template[i];
      if (state == 0) {
        if (c == '$') state = 1;
      }
      else if (state == 1) {
        if (c == '{') {
          parsedcode.push( template.substring(be, i-1) );
          state = 2;
          be = i + 1;
        }
        else state = 0;
      }
      else if (state == 2) {
        if (c == '}') {
          var name = template.substring(be, i);
          var idx = parsedcode.push(null) - 1;
          if (name_index[name]) {
            throw new Error('变量冲突 ' + name);
          }
          name_index[name] = idx;
          be = i + 1;
          state = 0;
        }
      }
    }

    if (be < i) {
      parsedcode.push( template.substring(be) );
    }
  }
}
