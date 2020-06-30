/**
 * tars框架的客户端实现类
 */
var assert         = require("assert");
var Promise         = require("@tars/utils").Promise;
var Protocol        = require("../rpc-tars").client;
var TarsError        = require("../util/TarsError.js").TarsError;
var RpcCallError   = require("../util/RpcCallError.js").RpcCallError;
var TQueue          = require("../util/TQueue.js").TQueue;
var EndpointManager = require("./EndpointManager.js").EndpointManager;
var ReqMessage      = require("./ReqMessage.js").ReqMessage;

var CheckTimeoutInfo = function ()
{
    this.minTimeoutInvoke       = 2;        //计算的最小的超时次数, 默认2次(在checkTimeoutInterval时间内超过了minTimeoutInvoke, 才计算超时)
    this.checkTimeoutInterval   = 60000;    //统计时间间隔, (默认60s, 不能小于30s)
    this.frequenceFailInvoke    = 5;        //连续失败次数
    this.minFrequenceFailTime   = 5;        //
    this.radio                  = 0.5;      //超时比例 > 该值则认为超时了 (0.1 <= radio <= 1.0)
    this.tryTimeInterval        = 30000;    //重试时间间隔，单位毫秒
    this.reconnectInterval      = 60000;    //非活跃节点调用失败时的重连时间间隔
};

///////////////////////////////////////////////定义调用类///////////////////////////////////////////////////////////////
var ObjectProxy = function () {
    this._objname          = "";            //ObjectProxy的名称
    this._setname          = "";            //使用stringtoProxy时指定的set名称
    this._pTimeoutQueue    = new TQueue();  //全局数据发送队列
    this._manager          = undefined;     //对端连接管理器
    this._version          = 1;             //协议号  tars:1 tup-complex:2  tup-simple:3
    this._requestId        = 1;             //当前服务队列的请求ID号
    this._iTimeout         = 3000;          //默认的调用超时时间
    this._protocol         = Protocol;      //当前端口上的协议解析器
    this._comm             = undefined;     //通信器实例
    this._bSyncInvokeFinish = false;        //在进程间同步调用完成的消息，在流量较小的时候加快触发屏蔽逻辑
    this._bRetryOnDestroy   = false;        //节点销毁时是否将发送失败的调用返还队列
    this._checkTimeoutInfo  = new CheckTimeoutInfo();
    this._iTransPoolSize     = 1;            //adapter中远端连接池大小
};
module.exports.ObjectProxy = ObjectProxy;

//定义ObjectProxy的属性函数
ObjectProxy.prototype.__defineSetter__("communicator", function (value){ this._comm = value; });
ObjectProxy.prototype.__defineGetter__("communicator", function (){ return this._comm; });

ObjectProxy.prototype.__defineGetter__("version", function () { return this._version; });
ObjectProxy.prototype.__defineSetter__("version", function (value) { this._version = value; });

ObjectProxy.prototype.__defineGetter__("timeout", function () { return this._iTimeout; });
ObjectProxy.prototype.__defineSetter__("timeout", function (value) { this._iTimeout = value; });

ObjectProxy.prototype.__defineGetter__("name", function () { return this._objname; });
ObjectProxy.prototype.__defineSetter__("name", function (value) { this._objname = value; });

ObjectProxy.prototype.__defineGetter__("pTimeoutQueue", function () { return this._pTimeoutQueue; });
ObjectProxy.prototype.__defineSetter__("pTimeoutQueue", function (value) { this._pTimeoutQueue = value; });

//初始化ObjectProxy
ObjectProxy.prototype.initialize = function ($ObjName, $SetName, options) {
    options = options || {};
    if(options.hasOwnProperty("bRetryOnDestroy")) this._bRetryOnDestroy = options.bRetryOnDestroy;
    if(options.hasOwnProperty("iTransPoolSize")) this._iTransPoolSize = options.iTransPoolSize;
    assert(typeof this._iTransPoolSize === "number" && this._iTransPoolSize > 0, "trans pool size must be > 1 number");

    this._manager = new EndpointManager(this, this._comm, $ObjName, $SetName, options);
    this._objname = this._manager._objname;
    this._setname = $SetName;
};

ObjectProxy.prototype.setProtocol = function ($protocol) {
    this._protocol = $protocol;
};

ObjectProxy.prototype.genRequestId = function () {
    return ++this._requestId;
};

ObjectProxy.prototype.setCheckTimeoutInfo = function (checkTimeoutInfo) {
    Object.assign(this._checkTimeoutInfo, checkTimeoutInfo);
}

ObjectProxy.prototype.setTransPoolSize = function (size) {
    assert(typeof size === "number" && size > 0, "trans pool size must be > 1 number");
    this._iTransPoolSize = size;
}

//当重新连接或者第一次连接上服务端时，传输类回调当前函数
ObjectProxy.prototype.doInvoke = function () {
    var self = this;

    self._pTimeoutQueue.forEach(function (key) {
        var reqMessage = self._pTimeoutQueue.pop(key, true);

        var adapter    = self._manager.selectAdapterProxy(reqMessage);

        if(adapter) {
            adapter.invoke(reqMessage);
        } else {
            self.doInvokeException(reqMessage);
        }
    });
};

//在没有选取对端接口成功的情况下，框架会将请求放到对应ObjectProxy的请求队列中
//此时如果一直连接服务不成功，reqMessage中的定时器会调用当前超时处理函数
ObjectProxy.prototype.doTimeout = function($reqMessage) {
    this._pTimeoutQueue.erase($reqMessage.request.iRequestId);

    $reqMessage.clearTimeout();
    $reqMessage.promise.reject(new RpcCallError({request:$reqMessage, response:undefined, error:{code:TarsError.CLIENT.REQUEST_TIMEOUT, message:"call remote server timeout(no adapter selected)"}}));
};

ObjectProxy.prototype.doInvokeException = function ($reqMessage) {
    $reqMessage.clearTimeout();
    $reqMessage.promise.reject(new RpcCallError({request:$reqMessage, response:undefined, error:{code:TarsError.SERVER.TARSADAPTERNULL, message:"select AdapterProxy is null"}}));
};

ObjectProxy.prototype.invoke = function($reqMessage) {
    var adapter  = this._manager.selectAdapterProxy($reqMessage);
    if (adapter) {
        adapter.invoke($reqMessage);
    } else {
        var hashCode = $reqMessage.request.property['hashCode'];

        var adapters = this._manager.getAllAdapters() || [];

        if(!hashCode || adapters.length == 0) {
            // 第一次调用的时候，adapters长度为0
            this._pTimeoutQueue.push($reqMessage.request.iRequestId, $reqMessage);
        }
    }

    return $reqMessage.promise.promise;
};

ObjectProxy.prototype.tars_invoke = function ($FuncName, $BinBuffer, $Property) {
    //判断最后一个参数，是否是属性结构体
    var extProperty = {};
    if (typeof $Property === 'object' && $Property !== null) {
        if ($Property.hasOwnProperty("dyeing")) {
            extProperty.dyeing  = $Property.dyeing;
        }
        if ($Property.hasOwnProperty("context")) {
            extProperty.context = $Property.context;
        }
        if ($Property.hasOwnProperty("packetType")) {
            extProperty.packetType = $Property.packetType;
        }
        if ($Property.hasOwnProperty("hashCode")) {
            extProperty.hashCode = $Property.hashCode;
        }
        if ($Property.hasOwnProperty("consistentHash")) {
            extProperty.consistentHash = $Property.consistentHash;
        }
        if($Property.hasOwnProperty("iVersion")){
            extProperty.iVersion = $Property.iVersion;
        }
    }

    //构造请求
    var reqMessage = new ReqMessage();
    reqMessage.request.iRequestId   = this.genRequestId();
    reqMessage.request.sServantName = this._objname;
    reqMessage.request.sFuncName    = $FuncName;
    reqMessage.request.appBuffer    = $BinBuffer;
    reqMessage.request.property     = extProperty;
    reqMessage.request.configure    = this._comm.configure;
    reqMessage.request.iTimeout     = this._iTimeout;
    reqMessage.promise              = Promise.defer();
    reqMessage.worker               = this;
    reqMessage.setTimeout(this._iTimeout);
    return this.invoke(reqMessage);
};
ObjectProxy.prototype.tup_invoke = function ($FuncName, $UniAttribute, $Property) {
    if ($Property === null || typeof $Property !== 'object') {
        $Property = {};
    }
    $Property.iVersion = this.version;
    $UniAttribute._iver = this.version;
    return this.tars_invoke($FuncName, $UniAttribute.encode(), $Property);
}
ObjectProxy.prototype.setSyncInvokeFinish = function(bSync){
    var self = this;
    //不在node-agent中运行，单进程运行，无需设置同步
    if(!process.send) {
        self._bSyncInvokeFinish = false;
        return;
    }
    if(!self.OnFinishInvoke){
        self.OnFinishInvoke = function(msg){
            if(!msg || !msg.event || msg.event!=="finishInvoke") return;
            if(msg.objname !== self._objname || msg.setname !== self._setname) return;
            self._manager.doFinishInvoke(msg.endpoint, msg.iResultCode);
        }
    }
    if(bSync) {
        process.on("message",this.OnFinishInvoke)
    } else {
        process.removeListener("message",this.OnFinishInvoke);
    }
    this._bSyncInvokeFinish = bSync;
}

ObjectProxy.prototype.destroy = function () {
    this._manager.destroy();
};
