
function a() {
  // console.log("Hi i'am sub thread.", a);
  return 1+200;
}


thread.on('mainmessage', function(data) {
  data.sub_id = thread.threadId;
  thread.send('submessage', data);
});


a();
