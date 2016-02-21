
function remove_all() {
  thread.off('remove_all');
  thread.off('remove_some');
  console.log('remove all !');
}

function remove_some() {
  thread.off('remove_all');
  thread.off('remove_some');
  thread.on('remove_some', remove_some);
}

thread.on('remove_all', remove_all);
thread.on('remove_some', remove_some);
// console.log('hi')
