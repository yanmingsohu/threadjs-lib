
var event_handles = {};


var event = {
  on: function(name, cb, _remove) {
    var dat = {
      cb     : cb,
      next   : null,
      remove : _remove,
    };
    if (!event_handles[name]) {
      event_handles[name] = { s: dat, e: dat };
    } else {
      if (event_handles[name].e) {
        event_handles[name].e.next = dat;
        event_handles[name].e = dat;
      } else {
        event_handles[name].e = event_handles[name].s = dat;
      }
    }
    return event;
  },

  once: function(name, cb) {
    return event.on(name, cb, true);
  },

  _iterator : function(name, cb) {
    var p, h = event_handles[name].s;
    var rm;

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
      if (h === event_handles[name].s) {
        event_handles[name].s = h.next;
      } 
      if (h === event_handles[name].e) {
        event_handles[name].e = p;
      } 
      if (p) {
        p.next == h.next;
      }
      rm = true;
    }
  },

  removeListener: function(name, cb) {
    if (!event_handles[name]) return;
    if (cb) {
      event._iterator(name, function(h, p, _remove) {
        if (h.cb === cb) {
          _remove(h, p);
        }
      });
    } else {
      event._iterator(name, function(h, p, _remove) {
        _remove(h, p);
      });
    }
    
    return event;
  },

  emit: function(name, data) {
    if (!event_handles[name]) return;
    event._iterator(name, function(h, p, _remove) {
      try {
        h.cb(data);
      } catch(err) {
        thread.send('error', err);
      }
      if (h.remove) {
        _remove(h);
      }
    });
    return event;
  },

  removeAllListeners: function() {
    event_handles = {};
  },
};

// ======================================================================

event.on('a', a);
event.on('a', a);
event.on('b', b1);
event.on('b', b2);
event.removeListener('b');
event.on('b', b1);
console.log(event_handles);

function a() {
}

function b1() {
}

function b2() {
}