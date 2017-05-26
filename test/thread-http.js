try { it; return; } catch(e) {}


thread.on('url', function(url) {
  thread.http.get(url, null, function(err, ret) {
    if (err) {
      thread.send('error', err);
    } else {
      thread.send('over', ret);
    }
  });
});
