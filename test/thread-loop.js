try { it; return; } catch(e) {}


thread.on('loop', function() {
  for(;;);
});

// for (;;);
