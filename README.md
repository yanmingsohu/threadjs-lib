Nodejs 多线程 / Nodejs Mulit Thread
===================================

`npm install threadjs-lib --save`

* 在主线程/子线程之间进行数据通信
* 轻量级的 v8 线程 (非 nodejs 线程)
* 子线程的主动挂起, 用来模拟同步操作
* 当子线程不再监听事件, 子线程会退出
* 主线程空闲且所有子线程都退出后, 主线程也会退出

> `npm start` 会启动一个命令行模式的线程
> 输入 js 代码可以立即在线程中运行查看结果


主线程中的 Api / Main thread Usage
==================================

> 下文中的数据, 即消息中携带的数据


```js
var thlib = require('threadjs-lib');

//
// 创建代码模板, 方便进行 js 代码的组装
// code 中是 js 脚本, 并且有变量绑定 ${name}
// name 变量必须在 config 中设置并被 config.name 的值替换
//
var tpl = thlib.code_template(code, config);

//
// 设置绑定变量的值
//
tpl.set(bind_name, value);

//
// 将代码模板使用变量绑定后返回最终代码, 字符串
//
tpl.code();

//
// 发送到线程的 js 代码
// the javascript code.
//
var code = "1+1";

//
// 子线程可调用库, default_lib 中有很多常用库的导出
// console 也包含在其中
//
var thread_lib = thlib.default_lib;

//
// 创建线程对象, 返回后线程开始运行
// create thread and handle
//
var handle = thlib.create(code[, 'filename', thread_lib]);

//
// 添加监听器, 接收来自线程的数据, 接收到的数据是副本
// Recive some message, the data *IS COPY* from thread.
//
handle.on('[message name]', function(data) {
  // TODO
});

//
// 当主线程收到这个消息说明子线程已经挂起
//
handle.on('_thread_locked', function() {
  //
  // 必须在接受到 _thread_locked 之后再合适的时候唤醒子线程, 否则子线程将无尽的等待
  // notify 的参数是唤醒数据, 将被子线程 wait 方法返回, 一旦成功该方法返回 true
  //
  handle.notify({some-wakeup-data});
});

//
// 删除指定的监听器
// remove message listener
//
handle.off('[message name]', Function);

//
// 向线程发送消息/数据, 线程接收到的数据是 data 的副本
// Send message, the data *COPY TO* thread.
//
handle.send('[message name]', data);

//
// 停止线程
// Thread will STOP
//
handle.stop();

//
// 返回上一次执行脚本花费的时间, 毫秒
// 如果线程正在执行, 会返回当前脚本花费时间
//
handle.use_time();
```


子线程中可用的 api / The Script of Thread
========================================

```js
//
// 接收来自主线程的数据
// recive message from Main Node Engine
//
thread.on('message-name', function(data) {});
thread.once(...);

//
// 向主线程发送数据
// send message to Main Node Engine
//
thread.send('message-name', data);

//
// 删除指定的监听器
// remove message listener
//
thread.off('message-name', Function);

//
// 挂起子线程, 直到被唤醒才返回, 如果 notify 设置了唤醒数据则返回数据
// 否则返回 true; 如果返回了 false 说明 wait 方法挂起失败.
//
thread.wait();

//
// 运行一段代码并返回, this 为当前全局上下文
//
eval(code);

//
// 事件, 与 nodejs 定义相同
//
new EventEmitter();

//
// 其他全局对象
//
Math, Number, String, parseInt, parseFloat, Array,
Boolean, Date, RegExp, Function, Error,
Int8Array, Uint8Array, Uint8ClampedArray, Int16Array,
Uint16Array, Int32Array, Uint32Array, Float32Array,
Float64Array, Int8Array,
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

    { name: 'Error/CompilerError' }
    当发生错误时主线程会接受到这个事件;
    CompilerError 编译错误: { jscode 出错的代码, columnnum 列, linenum 行 }

    if script in thread throw some error.
    ----------------------------------------------------------------------------


对子线程进行功能扩展
==================

### 主线程代码

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
// next : Function(err, data)
// unbind : Function() 调用后解除消息绑定
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


thlib.create(code[, 'filename', thread_lib]);
```

### 子线程代码

```js
//
// 主线程导出的函数会绑定在 thread 上
// 当需要回调函数时, 最后一个参数是回调函数
//
thread.namespace.getNextId('print current year chart', function(err, ret) {
  // TODO when main thread function was return.
})
```

version
========

    nodejs         v8
    ---------      ---------------------
    0.12.9         3.28.71.19
    6.9.1          5.1.281.84
