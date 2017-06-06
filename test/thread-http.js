try { it; return; } catch(e) {}

// for (var n in thread.http) {
//   console.log(n, typeof thread.http[n])
// }

thread.on('url', function(url) {
  thread.http.get(url, null, function(err, ret) {
    if (err) {
      thread.send('error', err);
    } else {
      thread.send('over', ret);
    }
  });
});
