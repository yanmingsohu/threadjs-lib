
var native = require('bindings')('threadnv');
var warp = require('./lib/main-warp.js')(native);

module.exports = warp;
warp.default_lib = require('./lib/default-libs.js');
