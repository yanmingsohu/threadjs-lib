var cp = require('child_process');
var fs = require('fs');

var env_dir = process.env.NODE_DIR;
if (env_dir) {
  fs.writeFileSync('node_dir', env_dir);
} else {
  try {
    env_dir = fs.readFileSync('node_dir', 'utf8');
  } catch(e) {
    console.log('WARN: cannot found "NODE_DIR" variable form Environment,',
      'Advanced features will not be available');
  }
}

var cmd = 'node-gyp';
var arg = ['rebuild'];
var opt = {
  env : process.env,
  cwd : process.cwd(),
  stdio: 'inherit',
};

if (env_dir) {
  arg.push('--nodedir', env_dir);
}

if (process.platform === 'win32') {
  cmd += '.cmd';
}

var child = cp.spawn(cmd, arg, opt);
