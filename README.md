Nodejs 多线程 / Nodejs Mulit Thread
===================================

`npm install threadjs-lib --save`

* 在主线程/子线程之间进行数据通信
* 轻量级的 v8 线程 (非 nodejs 线程)
* 子线程的主动挂起, 用来模拟同步操作
* 主线程空闲且所有子线程都退出后, 主线程也会退出
* 用 libuv 挂载的事件可以正确处理
* 使用 `npm test` 进行测试, 需要全局安装 `mocha`
* 可以在子线程中运行 nodejs 导出的本机方法

!! 一个线程崩溃不影响其他线程

> `npm start` 会启动一个命令行模式的线程
> 输入 js 代码可以立即在线程中运行查看结果



主线程中的 Api / Main thread Usage
==================================

> 下文中的数据, 即消息中携带的数据


## var thlib = require('threadjs-lib');

  引入库


## var tpl = thlib.code_template(code, config);

  创建代码模板, 方便进行 js 代码的组装
  code 中是 js 脚本, 并且有变量绑定 ${name}
  name 变量必须在 config 中设置并被 config.name 的值替换


## tpl.set(bind_name, value);

  设置绑定变量的值


## tpl.code();

  将代码模板使用变量绑定后返回最终代码, 字符串


## var code = "1+1";

  发送到线程的 js 代码
  the javascript code.


## var thread_lib = thlib.default_lib;

  子线程可调用库, default_lib 中有很多常用库的导出, console 也包含在其中


## var handle = thlib.create(code[, 'filename', thread_lib]);

  创建线程对象, 返回后线程开始运行, 如果 code=null 则读取文件并运行
  create thread and handle


## var handle = thlib.create_node(code[, 'filename', thread_lib]);

  进入 node 模式, 和主线程中一样使用 node 库.
  node 模式中, node 全局对象优先级更高, 这将覆盖 thread_lib 中导出的对象.


## handle.on('[message name]', function(data) { });

  添加监听器, 接收来自线程的数据, 接收到的数据是副本
  Recive some message, the data *IS COPY* from thread.


## handle.notify({some-wakeup-data});

  必须在接受到 wait 事件之后在合适的时候唤醒子线程, 否则子线程将无尽的等待
  notify 的参数是唤醒数据, 将被子线程 wait 方法返回, 一旦成功该方法返回 true.


## handle.off('[message name]', Function);

  删除指定的监听器
  remove message listener


## handle.offall();

  删除所有监听器, 这会让没有任务的进程退出.


## typeid = handle.reg_constructor(fn, tyoename);

  注册对象构建器, 为了在主线程/线程之间传递对象, 需要在两边注册对象构建器;
  否则默认只能传递 JSON 对象.


## handle.send('[message name]', data, typenameorid);

  向线程发送消息/数据, 线程接收到的数据是 data 的副本
  Send message, the data *COPY TO* thread.


## handle.stop();

  停止线程
  Thread will STOP


## handle.use_time();

  返回上一次执行脚本花费的时间, 毫秒
  如果线程正在执行, 会返回当前脚本花费时间
  当一个线程长时间执行死循环, 这个时间会无限延长


子线程中可用的 api / The Script of Thread
========================================


## thread.on('message-name', function(data) {});
## thread.once(...);

  接收来自主线程的数据, `thread` 是全局对象.
  recive message from Main Node Engine


## typeid = thread.reg_constructor(fn, tyoename);

  注册对象构建器


## thread.send('message-name', data, typenameorid);

  向主线程发送数据
  send message to Main Node Engine


## thread.off('message-name', Function);

  删除指定的监听器
  remove message listener


## thread.offall();

  删除所有监听器, 这可能导致线程结束


## thread.wait(_wait_event_name_, _wait_event_data_);

  挂起子线程, 直到被唤醒才返回, 如果主线程调用 notify() 设置了唤醒数据则返回该数据,
  否则返回 true; 如果返回了 false 说明 wait 方法挂起失败.

  _wait_event_name_ -- 发送一个事件到主线程, 默认 `_thread_locked`
  _wait_event_data_ -- 事件接收器收到的数据


## thread.create_context();

  创建一个上下文对象用于执行 eval()


## thread.eval(code, filename, offset, context);

  运行一段代码并返回, 如果未提供 context 参数 this 为 thread 上下文.


## new EventEmitter();

  事件, 与 nodejs 定义相同; 不支持 error 事件的抛出;
  没有 newListener/removeListener;


## 其他全局对象

  Math, Number, String, parseInt, parseFloat, Array,
  Boolean, Date, RegExp, Function, Error,
  setTimeout, setInterval, setImmediate, clearTimeout,
  clearInterval, clearImmediate,
  Int8Array, Uint8Array, Uint8ClampedArray, Int16Array,
  Uint16Array, Int32Array, Uint32Array, Float32Array,
  Float64Array, Int8Array,


## node 模式全局对象

  require, module, exports, console, global,
  `__dirname`, `__filename`, 等.


DEMO
====

## 启动轻量线程并运行一段程序

```js
var thlib = require('threadjs-lib');
var code = function fi() {
  var a=0, b=1, c=1;
  for (var i=0; i<100; ++i) {
    console.log(i, '\t', c);
    c = a + b;
    a = b;
    b = c;
  }
}.toString() + '; fi();';

var handle = thlib.create(code, 'test', thlib.default_lib);
handle.on('end', function() {
  console.log('thread exited');
});
```


## 启动 node 线程运行一段程序

```js
var thlib = require('threadjs-lib');
var code = function _node() {
  console.log(process.versions);
}.toString() + '; _node();';

var handle = thlib.create_node(code, 'node');
handle.on('end', function() {
  console.log('thread exited');
});

```

事件 / Predefined Event
=======================

`end`

    当线程结束后, 主线程会接受到这个消息

    when script in thread is end, always trigger.
    ----------------------------------------------------------------------------

`warn`

    警告信息
    ----------------------------------------------------------------------------

`error`

    回调参数: Error / CompilerError  
    当发生错误时主线程会接受到这个事件;
    CompilerError 编译错误: { jscode 出错的代码, columnnum 列, linenum 行 }

    if script in thread throw some error.
    ----------------------------------------------------------------------------


对子线程进行功能扩展
==================

子线程使用一个消息来模拟调用函数, 库的代码在主线程中运行, 主线程运行结束
使用消息将结果返回给子线程, 这种方式让子线程看起来在调用函数; 其运行机理
与远程过程调用相似.


## 主线程代码

```js
//
// 创建对线程功能函数库的配置
//
var thread_lib = {
  // 名字的空间
  'namespace' : {
    // 扩展函数名称, 在子线程中调用
    'getNextId' : {
      ret  : true,  // 是否需要回调, 如果需要必须设置为 true
      argc : -1,    // 参数数量 -1 动态参数, 0 无参数, >0 固定参数
      fn   : _fn,   // 实现函数
      mult : false, // 返回回调会调用多次, 需要实现函数解绑定
    }
  }
};

//
// 实现函数的签名, args 是调用时的参数, next 是结束后的回调
// next   : Function(err, data)
// unbind : Function() 调用后解除消息绑定 mult=true 时使用
//
function _fn(args, next, unbind) {
  // 当前线程上下文, 可以与调用此函数的子线程通讯
  this.threadId;
  this.on(...);
  this.send(...);
  // 解析参数
  args.length;
  args[1], args[2]
  // 最后返回给调用此函数的子线程
  next(null, 'print over');
}

//
// 创建线程时, 将扩展库对象传入
//
thlib.create(code, 'filename', thread_lib);
```


## 子线程代码

```js
//
// 主线程导出的函数会绑定在 thread 上
// 当需要回调函数时, 最后一个参数是回调函数
//
thread.namespace.getNextId('print current year chart', function(err, ret) {
  // TODO call when main thread function was return.
})
```


version
========

threadjs    nodejs     v8
----------  ---------  --------------
0.1.x       0.12.9     3.28.71.19
0.1.x       6.9.1      5.1.281.84
0.1.x       6.10.3     5.1.281.101
