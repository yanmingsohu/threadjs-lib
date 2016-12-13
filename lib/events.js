
if (exports) {
  module.exports = EventEmitter;
}

//
// 为子线程服务, 模拟一个 Event 库的实现
//
function EventEmitter() {
  this.event_handles = {};
  this.all_count     = 0;
  this.event_count   = {};
}


EventEmitter.prototype = {

  on: function(name, cb, _remove) {
    var dat = {
      cb     : cb,
      next   : null,
      remove : _remove,
    };
    if (!this.event_handles[name]) {
      this.event_handles[name] = { s: dat, e: dat };
    } else {
      if (this.event_handles[name].e) {
        this.event_handles[name].e.next = dat;
        this.event_handles[name].e = dat;
      } else {
        this.event_handles[name].e = this.event_handles[name].s = dat;
      }
    }
    this.all_count += 1;
    if (isNaN(this.event_count[name])) {
      this.event_count[name] = 1;
    } else {
      this.event_count[name] += 1;
    }
    return this;
  },


  once: function(name, cb) {
    return this.on(name, cb, true);
  },


  _iterator : function(name, cb) {
    var p, h = this.event_handles[name].s;
    var rm, thiz = this;

    while (h) {
      cb(h, p, _remove);
      if (!rm) {
        p = h;
      } else {
        rm = false;
      }
      h = h.next;
    }

    function _remove(h, p) {
      if (h === thiz.event_handles[name].s) {
        thiz.event_handles[name].s = h.next;
      }
      if (h === thiz.event_handles[name].e) {
        thiz.event_handles[name].e = p;
      }
      if (p) {
        p.next == h.next;
      }
      rm = true;

      thiz.event_count[name] -= 1;
      thiz.all_count -= 1;
    }
  },


  listenerCount: function(name) {
    if (!name) {
      return this.all_count;
    }
    return this.event_count[name] || 0;
  },


  removeListener: function(name, cb) {
    if (!this.event_handles[name]) return;
    if (cb) {
      this._iterator(name, function(h, p, _remove) {
        if (h.cb === cb) {
          _remove(h, p);
        }
      });
    } else {
      this._iterator(name, function(h, p, _remove) {
        _remove(h, p);
      });
    }
    return this;
  },


  emit: function(name, data) {
    if (!this.event_handles[name]) return;
    this._iterator(name, function(h, p, _remove) {
      if (h.remove) _remove(h);
      h.cb(data);
    });
    return this;
  },


  removeAllListeners: function() {
    this.event_handles = {};
    this.all_count     = 0;
    this.event_count   = {};
    return this;
  },

};
