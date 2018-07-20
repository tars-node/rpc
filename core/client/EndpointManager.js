var Registry     = require("@tars/registry");
var Endpoint     = require("@tars/utils").Endpoint;
var TimeProvider = require("@tars/utils").timeProvider;
var AdapterProxy = require("./AdapterProxy.js").AdapterProxy;
var HashRing     = require("hashring");

/////////////////////////////////////////////主控地址管理类/////////////////////////////////////////////////////////////
var EndpointManager = function ($RefObjectProxy, $RefCommunicator, $ObjectName, $SetName, options) {
    options = options || {};
    this._registry=Registry.New();
    this._objname   = $ObjectName;      //分离之后ServantName的名字
    this._setname   = $SetName;         //SET的名称
    this._worker    = $RefObjectProxy;  //ObjectProxy引用
    this._comm      = $RefCommunicator; //通信器引用
    this._adapters  = [];               //当前服务下所有的通信代理类
    this._hash      = 0;                //Hash值
    this._iVnodeNumber = 100;             //一致性哈希，虚拟节点个数
    this._hashRing  = undefined;        //一致性hashring
    this._direct    = false;            //是否是直连服务，否则需要走主控查询可用地址+端口
    this._bRequest  = false;            //是否正在请求中

    this._iRefreshTime          = 0;       //IPList的刷新时间
    this._iRefreshInterval      = 60000;   //请求列表的频率，单位毫秒
    this._iActiveEmptyInterval  = 10000;   //请求回来活跃列表为空的间隔时间，单位毫秒
    this._iRequestTimeout       = 0;       //请求的超时时间(绝对时间) 防止请求回调丢了。一直在正在请求状态
    this._iWaitTime             = 5000;    //请求主控的等待时间，单位毫秒
    this._loacator              = undefined; // 主控

    //创建一致性hashring，若要指定虚拟节点个数，可通过这种方式启动hashring功能
    if(options.bEnableConsistentHash){
        this._hashRing = new HashRing();
        if(typeof options.vnodeNumber == "number") this._iVnodeNumber = options.vnodeNumber;
    }

    this._initialize($ObjectName);
};
module.exports.EndpointManager = EndpointManager;

//解析服务端名称，发现是否是直连端口
EndpointManager.prototype._initialize = function ($ObjectProxyName) {
    var options = $ObjectProxyName.split('@');
    if (options.length != 2) {
        return;
    }

    this._objname = options[0];
    this._direct  = true;
    var endpoints = options[1].split(":");
    for (var i = 0; i < endpoints.length; i++) {
        this._addEndpoint(Endpoint.parse(endpoints[i]));
    }
};

EndpointManager.prototype.getAllAdapters = function()
{
    return this._adapters || [];
};

EndpointManager.prototype._initHashRing = function()
{
    this._hashRing = new HashRing();
    var hasKey, hash;
    for(var i=0; i< this._adapters.length; i++){
        var endpoint = this._adapters[i].endpoint;
        hasKey = endpoint.sHost + ":" + endpoint.iPort;
        hash = {};
        hash[hasKey] = {vnode: this._iVnodeNumber};
        this._hashRing.add(hash);
    }
};

EndpointManager.prototype._addEndpoint = function ($endpoint) {
    var adapter = new AdapterProxy();
    adapter.worker   = this._worker;
    adapter.endpoint = $endpoint;
    adapter.initialize();

    this._adapters.push(adapter);
    //新增节点添加到hashring中
    if(this._hashRing){
        var hasKey = $endpoint.sHost + ":" + $endpoint.iPort, hash = {};
        hash[hasKey] = {vnode: this._iVnodeNumber};
        this._hashRing.add(hash);
    }
    return adapter;
};

EndpointManager.prototype._doEndpointsException = function (data) {
    if(data && data.response && data.response.error){
        console.error("[TARS][EndpointManager doEndpoints, exception ,return:",data.response.error.code," ,objname:", this._worker.name," ,setname:",this._setname);
    }
    this._bRequest     = false;
    this._iRefreshTime = TimeProvider.nowTimestamp() + 2000; //频率控制获取主控失败 2秒钟再更新
};

//根据传入的协议、地址以及端口号查找是否已在列表中
EndpointManager.prototype._findEndpointByInfo = function ($endpoint) {
    for (var i = 0; i < this._adapters.length; i++) {
        var adapter = this._adapters[i];
        if (adapter._endpoint.sProtocol === $endpoint.sProtocol && adapter._endpoint.sHost === $endpoint.sHost && adapter._endpoint.iPort === $endpoint.iPort) {
            return adapter;
        }
    }

    return undefined;
};

EndpointManager.prototype._findEndpointByIpPort = function (ipPort) {
    for (var i = 0; i < this._adapters.length; i++) {
        var adapter = this._adapters[i];
        if ( adapter._endpoint.sHost === ipPort.sHost && adapter._endpoint.iPort === ipPort.iPort) {
            return adapter;
        }
    }

    return undefined;
};

//请求主控的处理函数
EndpointManager.prototype._doEndpoints = function (result) { //如果请求主控服务成功
    if (result.response.return != 0) {
        console.error("[TARS][EndpointManager doEndpoints exception ,return:",result.response.return," ,objname:", this._worker.name," ,setname:",this._setname);
        return this._doEndpointsException();
    }
    var nowTime = TimeProvider.nowTimestamp();
    this._bRequest = false;

    //有回成功的结点，按照正常的频率更新
    //如果返回空列表，则不更新本地的节点列表 10s刷新一次
    if(result.response.arguments.activeEp.value.length == 0 ){
        this._iRefreshTime = nowTime + this._iActiveEmptyInterval;
        console.error("[TARS][EndpointManager doEndpoints, callback activeEps is empty,objname:", this._worker.name," ,setname:",this._setname);
        return;
    } else {
        this._iRefreshTime = nowTime + this._iRefreshInterval;
    }

    //01 将新的节点接入到活动列表中
    var actives   = [], i = 0, bHasNew = false;
    var endpoints = result.response.arguments.activeEp;
    for (i = 0, len = endpoints.value.length; i < len; i++) {
        var newEndpoint = new Endpoint();
        newEndpoint.sProtocol = endpoints.value[i].istcp?"tcp":"udp";
        newEndpoint.sHost     = endpoints.value[i].host;
        newEndpoint.iPort     = endpoints.value[i].port;
        newEndpoint.iTimeout  = endpoints.value[i].timeout || 0;
        newEndpoint.setId     = endpoints.value[i].setId || '';
        newEndpoint.containerName = endpoints.value[i].containerName || '';

        if (this._findEndpointByInfo(newEndpoint) === undefined) { //如果不在已有列表中，则新加入
            bHasNew = true;
            this._addEndpoint(newEndpoint, true);
        }
        actives.push(newEndpoint);
    }
    //02 将已经去除的地址，从活动列表中删除
    for (i = 0; i < this._adapters.length; i++) {
        var bFound   = false;
        var endpoint = this._adapters[i]._endpoint;

        //查找该地址是否在活动列表中
        for (var ii = 0, len = actives.length; ii < len; ii++) {
            if (endpoint.sProtocol === actives[ii].sProtocol && endpoint.sHost === actives[ii].sHost && endpoint.iPort === actives[ii].iPort) {
                bFound = true;
                break;
            }
        }

        //如果在活动列表中没有找到，则说明该地址被停止了或者去除了，则从当前的队列中删除
        if (!bFound) {
            this._adapters[i].destroy();
            this._adapters.splice(i, 1);
            //从hashring中删除
            if(this._hashRing){
                this._hashRing.remove(endpoint.sHost + ":" + endpoint.iPort);
            }
            i--;
        }
    }
    //每次adapter列表添加新成员之后sort一次，保证所有节点的adapter顺序一致，避免出现使用hashcode时节点仍然没有分发到同一节点的情况
    if(bHasNew){
        this._adapters.sort(function(adapter1, adapter2){
            return adapter1.endpoint.sHost > adapter2.endpoint.sHost;
        });
    }
    //03 通知对应的ObjectProxy可以发送缓存中的请求了
    this._worker.doInvoke();
}

//非直连的情况下，到主控查询活动列表
EndpointManager.prototype._dns = function () {
    var nowTime = TimeProvider.nowTimestamp();

    //01 先判断是否可以查主控
    if (this._direct) { //如果是直连，不查主控
        return ;
    }
    if (this._bRequest && this._iRequestTimeout < nowTime) { //如果正在请求中，但已经超时，则重置
        console.error("[TARS][EndpointManager doEndpoints, requesting but timeout ,objname:", this._worker.name," ,setname:",this._setname);
        this._doEndpointsException();
    }
    if (this._bRequest || this._iRefreshTime > nowTime) { //如果正在请求，或者还没到重试时间
        return;
    }

    //02 根据是否开起SET化查询不同的活动IPList
    this._bRequest = true;
    this._iRequestTimeout = nowTime + this._iWaitTime;
    var locator = this._comm.getProperty("locator");
    if(!this._loacator) {
        // 第一次加载主控
        this._loacator = locator;
        this._registry.setLocator(locator);
    } else {
        // 非首次加载主控
        if(this._loacator != locator) {
            // 主控发生改变
            console.log('[locator] [old]' + this._loacator + ' [new] ' + locator);
            this._loacator = locator;
            this._registry.resetLocator(locator);
        }
    }

    if (this._comm.ClientConfig.SetOpen || this._setname) {
        this._registry.findObjectByIdInSameSet(this._objname, this._setname || this._comm.ClientConfig.SetDivision).then(this._doEndpoints.bind(this), this._doEndpointsException.bind(this));
    } else {
        this._registry.findObjectByIdInSameGroup(this._objname).then(this._doEndpoints.bind(this), this._doEndpointsException.bind(this));
    }
};

//按照一定的规则选取一个可用的服务连接
EndpointManager.prototype.selectAdapterProxy = function (reqMessage) {

    //01 如果是非直连，则进入请求主控处理逻辑
    !this._direct && this._dns();

    //若当前节点列表为空，直接返回
    if(!this._adapters || this._adapters.length == 0) return;

    //02 hashcode 调用
    var adapter, adapters = [];
    var hashCode = +reqMessage.request.property['hashCode'];
    var consistentHash = reqMessage.request.property['consistentHash'];
    var useHashCode = consistentHash || (hashCode && !isNaN(hashCode));
    adapters = this._adapters.slice(0);

    if(useHashCode){
        if(consistentHash){
            //一致性哈希
            if(!this._hashRing) this._initHashRing();
            //这里其实应该unique的
            var range = this._hashRing.range(consistentHash, adapters.length), firstHashAdapter;
            do{
                var ipPort = range[0].split(":");
                adapter = this._findEndpointByIpPort({sHost: ipPort[0], iPort: parseInt(ipPort[1])});
                if(!adapter){
                    range.splice(0, 1);
                    continue;
                }
                if(adapter.checkActive()) {
                    return adapter;
                }
                range.splice(0, 1);
                if(!firstHashAdapter) firstHashAdapter = adapter;
            } while (range.length > 0);
            adapter = firstHashAdapter;
        } else {
            // 取模哈希
            var hash;
            do {
                hash = hashCode % adapters.length;
                adapter = adapters[hash];
                if(adapter.checkActive()) {
                    return adapter;
                }
                adapters.splice(hash, 1);
            } while (adapters.length > 0);
            adapters = this._adapters.slice(0);
            hash = hashCode % adapters.length;
            adapter = adapters[hash];
        }
        //强制连接
        adapter.checkActive(true);
        reqMessage.adapter=adapter;
        reqMessage.RemoteEndpoint=adapter._endpoint;
        adapter.pushTimeoutQueueN(reqMessage);
        return;
    }

    // 03 检查是否有可用的连接
    for (var i = 0; i < this._adapters.length; i++) {
        adapter = this._adapters[(this._hash++)%this._adapters.length];
        if (adapter.checkActive()) {
            return adapter;
        }
    }

    // 如果当前没有可用的连接，则随机选取一个
    adapter = this._adapters[(this._hash++)%this._adapters.length];
    adapter.checkActive(true); //强制连接

    // 04 返回可用的连接代理类
    return;
};

EndpointManager.prototype.doFinishInvoke = function(endpoint, iResultCode){
    var adapter = this._findEndpointByInfo(endpoint);
    if(adapter){
        adapter._doFinishInvoke(iResultCode);
    }
}

//销毁
EndpointManager.prototype.destroy = function () {
    for (var i = 0; i < this._adapters.length; i++) {
        this._adapters[i].destroy();
    }
};
