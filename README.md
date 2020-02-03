# @tars/rpc

`@Tars / RPC 'is a tars RPC call framework, which provides an infrastructure for RPC calls between multi server processes. It can achieve the following capabilities:



-Use [tars2node] (https://github.com/tars-node/tars2node) to translate the tars file into client agent code, and then the client can call any tars service.



-After using [tars2node] (https://github.com/tars-node/tars2node) to translate the tars file into the server code, the standard tars service can be implemented, which can be directly called by any client using the tars / tup protocol.



-Services in the framework of remote log, dye log, attribute reporting, alarm reporting and service communication.



-Create client-side proxy classes for custom communication protocols (such as protocols in JSON format).



-Create the server side of the custom communication protocol (for example, protocol in JSON format).



-Module: @ tar / registry, function: query the available IP list of the service from the master according to the service obj name.



Tars RPC is divided into two parts: client and server



*The client part provides RPC proxy generation, message routing and network communication functions.



*The server side provides remote service exposure, request distribution, network communication and other functions.
## Install

``` bash
npm install @tars/rpc
```

##Notes on the agreement and the tars document



**Before we further study the related knowledge of tars, we should first clarify the relationship among the three protocols: "tars coding protocol", "tup group package Protocol" and "tars group package Protocol":**



-Tars encoding protocol is a kind of data encoding and decoding rules, which encodes data types such as integer, enumeration value, string, sequence, dictionary, custom structure into binary data stream according to certain rules. After receiving the binary data stream, the original value can be obtained by deserializing according to the corresponding rules.



-The tars encoding protocol uses an integer value (unsigned char) called tag to identify variables. For example, if the tag value of a variable is 100 (the value is defined by the developer), the tag value will be encoded as well as the variable value. When the opposite end needs to read the value of the variable, it will look for the data segment with tag value of 100 in the data stream, and then read out the data part according to the rules, which is the value of the variable.



-The location of tars coding protocol is a set of coding rules. The data serialized by the tars protocol can not only be transmitted on the network, but also be stored in the database.



-The tup packet forming protocol is the upper encapsulation of the tars coding protocol, which is positioned as the communication protocol. It uses the variable name as the key word of the variable. When encoding, it packs the variable name into the data stream. When decoding, it finds the corresponding data area according to the variable name, and then deserializes the data area according to the data type to get the original value.



-The tup package forming protocol has a built-in < Map > type of the tars encoding protocol. The key of the < Map > is the variable name, and the value is the binary data whose data value is serialized by the tars encoding.



-The packets encapsulated by tup can be directly sent to the tars server, and the server can directly deserialize the original values.



-Tars group packet protocol is a communication protocol encapsulated with tars encoding protocol for request packet (request structure) and response packet (result structure). The structure contains important information such as request serial number, protocol type, binary data after RPC parameter serialization, etc.



For the encoding and decoding rules of the tars encoding protocol and the compilation method of the tars file, please refer to [@ tar / steam document] (https://github.com/tar-node/stream/blob/master/readme.md).



When using, you can define the communication description file according to the requirements, and then convert the required code file through the [tars2node] (https://github.com/tar-node/tars2node) tool. For specific instructions, please refer to the 'tars2node' description file.



An example of an example



1. Clone this project.



2. Execute in the root directory of the project:

```bash
npm install
```

3. 在 `/rpc/examples/rpc-tars/demo.1/server.node.1` 

``` bash
node main.js
```

4. 在 `/rpc/examples/rpc-tars/demo.1/client.node.proxy` 

``` bash
node main.js
```

##Development steps



1. Write the tars file, define the constant, enumeration value, structure, function and other communication protocols used for communication between the client and the server. We use the following tars file as an example:



>Generally speaking, the tars file is usually developed, maintained and provided by the "server development".

```c++
module TRom
{
    struct User_t
    {
        0 optional int id = 0;
        1 optional int score = 0;
        2 optional string name = "";
    };

    struct Result_t
    {
        0 optional int id = 0;
        1 optional int iLevel = 0;
    };

    interface NodeJsComm
    {
        int test();

        int getall(User_t stUser, out Result_t stResult);

        int getUsrName(string sUsrName, out string sValue1, out string sValue2);

        int secRequest(vector<byte> binRequest, out vector<byte> binResponse);
    };
};
```
Save the above as: nodejscomm.tar.




2. Generate the client call code according to the tars file:



` ` Bash

tars2node --client NodeJsComm.tars

` ` ` `



3. Write client program



```javascript

//Step01 introduces system modules and code generated by tools

var Tars = require("@tars/rpc").client;

var TRom = require("./NodeJsCommProxy.js").TRom;



//Step02 initializing the tars client

//This step is optional, and the following documents will show you when the [tars]. Client.initialize function needs to be called and what it does

//The initialize function only needs to be called once, and is available globally after initialization

//We don't need to use too many features in the demo, so we annotate them first

//Tars.initialize("./config.conf");



//Step03 generate the instance of server calling proxy class

var prx = Tars.stringToProxy(TRom.NodeJsCommProxy, "TRom.NodeJsTestServer.NodeJsCommObj@tcp -h 127.0.0.1 -p 14002 -t 60000");



//Step04 client call uses promise mechanism for callback, here write successful and failed callback functions
var success = function (result) {
	console.log("result.response.costtime:",    		result.response.costtime);
	console.log("result.response.return:",      		result.response.return);
	console.log("result.response.arguments.stResult:",  result.response.arguments.stResult);
}

var error = function (result) {
	console.log("result.response.costtime:",			result.response.costtime);
    console.log("result.response.error.code:",         	result.response.error.code);
    console.log("result.response.error.message:",       result.response.error.message);
}

//STEP05 初始化接口参数，开始调用RPC接口
var stUser = new TRom.User_t();
stUser.name = "tencent-mig";

prx.getall(stUser).then(success, error).done();
```
Save the above code as' client. JS'. Use the following command to call the server.

``` bash
node client.js
```

>result.response.costtime: 7

>result.response.return: 200

>result.response.arguments.stResult: { id: 10000, iLevel: 10001 }

As long as there is a corresponding tars file, you can call the tars service provided by C + +, Java, PHP and node.js.



4. Generate the server code according to the tars file:



` ` Bash

tars2node --server NodeJsComm.tars

` ` ` `



5. Write the server program



[tars2node] (https://github.com/tar-node/tars2node) tool will generate 'nodejscomm. JS' and' nodejscommip. JS'.

Developers * * Don't need to or try not to * * Change 'nodejscomm. JS'. This file mainly implements the structure encoding and decoding, function parameter encoding and decoding, function distribution and other functions.

Developers only need to fill in the RPC function defined in 'nodejscommimp. JS' to implement business logic.

```javascript
var TRom = require('./NodeJsComm.js').TRom;
module.exports.TRom = TRom;

TRom.NodeJsCommImp.prototype.initialize = function ( ) {
    //TODO::

}

TRom.NodeJsCommImp.prototype.test = function (current) {
    //TODO::

}

TRom.NodeJsCommImp.prototype.getall = function (current, stUser, stResult) {
    //TODO::
//At the beginning, each RPC function is empty. Developers need to fill in the blanks by themselves to make up the missing business logic.

//After completing the business logic, the developer calls the sendresponse function of current to return the data to the caller.

//Note: the sendresponse of each function is different, and its parameters correspond to the return value and output parameter of the current function.

//If the current function has a return value, the first parameter of current.sendresponse should be that return. In the example, the return value of the current function is int type, and we return 200 as the example.

//After solving the problem of return value, we can write the current output parameters in order. The encoding and decoding of parameters and network transmission are solved by the framework.

	stResult.id		= 10000;
	stResult.iLevel	= 10001;

	current.sendResponse(200, stResult);
}

TRom.NodeJsCommImp.prototype.getUsrName = function (current, sUsrName, sValue1, sValue2) {
    //TODO::

}

TRom.NodeJsCommImp.prototype.secRequest = function (current, binRequest, binResponse) {
    //TODO::

}
```

Next, create a service entry file. It is mainly responsible for reading configuration files, configuring ports, setting protocol parsers, starting services and so on.

```javascript
var Tars  = require("@tars/rpc").server;
var TRom = require("./NodeJsCommImp.js").TRom;

var svr  = Tars.createServer(TRom.NodeJsCommImp);
svr.start({
    name     : "TRom.NodeJsTestServer.NodeJsCommObjAdapetr",
    servant  : "TRom.NodeJsTestServer.NodeJsCommObj",
    endpoint : "tcp -h 127.0.0.1 -p 14002 -t 10000",
    protocol : "tars",
	maxconns : 200000
});

console.log("server started.");
```
Save the above code as server.js and start it with the following command.



```bash

node server.js

` ` ` `



##Client initialization function



In the demo code, we mentioned that initialize doesn't have to show the call, we can also set the parameters we need in other ways.



First, let's look at the format and necessary parameters of the configuration file:
```
<tars>
    <application>
        <client>
            locator = tars.tarsregistry.QueryObj@tcp -h 127.0.0.1 -p 14002
            async-invoke-timeout=60000（ms）
        </client>
    </application>
</tars>
```

This configuration file is generated automatically by 'tarsnode'. We mainly use two configuration sections, 'tar. Application. Client. Locator' and 'tar. Application. Client. Async invoke timeout'.



>When can I not call the initialize function?

>If we use the direct connection mode for each server when generating the server proxy, that is, specifying the IP address in the stringtoproxy can avoid initialization.



In addition to using the configuration file to set these two parameters, we can call [@ tar s / RPC]. Client external exposure method to set:

```
var Tars  = require("@tars/rpc").client;

Tars.setProperty("locator", "tars.tarsregistry.QueryObj@tcp -h 127.0.0.1 -p 14002");
Tars.setProperty("timeout", 60000);
```

The above call method is equivalent to using the configuration file.



##How to create the tars service



There are three ways for Tars to create a standard Tars service:



*Configuration files generated using 'tarsnode':



Using this method is the same as using tars C + +, we need to configure the obj of the service in the tars management platform, and then 'tarsnode' will automatically generate the configuration file containing the listening port when starting the program. The service framework then depends on the configuration to bind the port to start the service.



! [tar service creation] (https://raw.githubusercontent.com/tar-node/rpc/master/docs/images/platform.png)



The configuration file generated by tarsnode is similar to the following:

```
<tars>
	<application>
		enableset=n
		setdivision=NULL
		<server>
			node=tars.tarsnode.ServerObj@tcp -h 127.0.0.1 -p 14002 -t 60000
			app=TRom
			server=NodeJsTestServer
			localip=127.0.0.1
			netthread=2
			local=tcp -h 127.0.0.1 -p 10002 -t 3000
			basepath=/usr/local/app/tars/tarsnode/data/MTT.NodeJSTest/bin/
			datapath=/usr/local/app/tars/tarsnode/data/MTT.NodeJSTest/data/
			logpath=/usr/local/app/tars/app_log//
			logsize=15M
			config=tars.tarsconfig.ConfigObj
			notify=tars.tarsnotify.NotifyObj
			log=tars.tarslog.LogObj
			deactivating-timeout=3000
			openthreadcontext=0
			threadcontextnum=10000
			threadcontextstack=32768
			closeout=0
			<TRom.NodeJsTestServer.NodeJsCommObjAdapter>
				allow
				endpoint=tcp -h 127.0.0.1 -p 14002 -t 60000
				handlegroup=TRom.NodeJsTestServer.NodeJsCommObjAdapter
				maxconns=200000
				protocol=tars
				queuecap=10000
				queuetimeout=60000
				servant=TRom.NodeJsTestServer.NodeJsCommObj
				shmcap=0
				shmkey=0
				threads=5
			</TRom.NodeJsTestServer.NodeJsCommObjAdapter>
		</server>
		<client>
			locator=tars.tarsregistry.QueryObj@tcp -h 127.0.0.1 -p 14002:tcp -h 127.0.0.1 -p 14003
			refresh-endpoint-interval=60000
			stat=tars.tarsstat.StatObj
			property=tars.tarsproperty.PropertyObj
			report-interval=60000
			sample-rate=1000
			max-sample-count=100
			sendthread=1
			recvthread=1
			asyncthread=3
			modulename=TRom.NodeJsTestServer
			async-invoke-timeout=60000
			sync-invoke-timeout=3000
		</client>
	</application>
</tars>
```

We use this profile to create a service:



```javascript

//Step01 introduces key modules

var Tars = require("@tars/rpc");

var TRom = require("./NodeJsCommImp.js");



//Step02 create an instance of a service

//Note the configuration here. In the formal environment, process.env.tars'config is used to represent the path of the configuration file

//That is: SVR. Initialize (process. Env. Tars_config, function (server) {...});

var svr = new Tars.server();

svr.initialize("./TRom.NodeJsTestServer.config.conf", function (server){

server.addServant(TRom.NodeJsCommImp, server.Application + "." + server.ServerName + ".NodeJsCommObj");

};



//After step03 initializes the service, start the service

Svr.start ();

` ` ` `



*Display configuration server information



```javascript

//Step01 introduces key modules
var Tars  = require("@tars/tars").server;
var TRom = require("./NodeJsCommImp.js").TRom;


var svr  = Tars.createServer(TRom.NodeJsCommImp);
svr.start({
    name     : "TRom.NodeJsTestServer.AdminObjAdapetr",
    servant  : "TRom.NodeJsTestServer.AdminObj",
    endpoint : "tcp -h 127.0.0.1 -p 14002 -t 10000",
    maxconns : 200000,
    protocol : "tars"
});

console.log("server started.");
```

*Select some services to start from the configuration file generated by 'tarsnode'

```javascript
//Step01 introduces key modules
var Tars   = require("@tars/rpc");
var TRom  = require("./NodeJsCommImp.js");

Tars.server.getServant("./TRom.NodeJsTestServer.config.conf").forEach(function (config){
    var svr, map;
    map = {
        'TRom.NodeJsTestServer.NodeJsCommObj' : TRom.NodeJsCommImp
    };

    svr = Tars.server.createServer(map[config.servant]);
    svr.start(config);
});

```

##The implementation principle of the clients of tars



! [client system architecture] (https://raw.githubusercontent.com/tar-node/rpc/master/docs/images/client.png)




##The implementation principle of tars server



! [server system architecture] (https://raw.githubusercontent.com/tar-node/rpc/master/docs/images/server.png)




##Tars calls the third party protocol service as a client



We assume the JSON format as the communication protocol:



```json

//Client - > server

  Error
{
	"P_RequestId" : 0,
	"P_FuncName"  : "test",
	"P_Arguments" : ["aa", "bb"]
}

//Client <-- Server
{
	"P_RequestId" : 0,
	"P_FuncName"  : "test",
	"P_Arguments" : ["ee", "ff"]
}
```

Implementation protocol resolution class:

```javascript
//save as Protocol.js
var EventEmitter = require("events").EventEmitter;
var util         = require("@tars/util");

var stream = function () {
    EventEmitter.call(this);
    this._data = undefined;
    this._name = "json";
}
util.inherits(stream, EventEmitter);

stream.prototype.__defineGetter__("name", function () { return this._name; });

module.exports = stream;

/**
*How to package according to the incoming data

* @param request

*Request.irequestid: request sequence number generated by the framework

*Request.sfuncname: function name

*Request.arguments: list of arguments to the function
 */
stream.prototype.compose = function (data) {
    var str = JSON.stringify({
		P_RequestId : data.iRequestId,
		P_FuncName  : data.sFuncName,
		P_Arguments : data.Arguments
	});

    var len = 4 + Buffer.byteLength(str);
    var buf = new Buffer(len);
    buf.writeUInt32BE(len, 0);
    buf.write(str, 4);

    return buf;
}

/**
 *
*After the network receives the packet, fill in the data to determine whether the packet is complete

*The incoming data of @ param data may be TCP fragmentation, not necessarily a complete data request. The data cache work should be done well within the protocol parsing class

*

*When there is a complete request, the unpacking function throws an event. The data members of the event should be supplemented in the following format:

*

* {

*Irequestid: 0, / / serial number of this request

*Sfuncname: '', / / the function name of this request

*Arguments:] / / parameter list of this request
 * }
 *
 */
stream.prototype.feed = function (data) {
    var BinBuffer = data;
    if (this._data != undefined) {
        var temp = new Buffer(this._data.length + data.length);
        this._data.copy(temp, 0);
        data.copy(temp, this._data.length);
        this._data = undefined;
        BinBuffer = temp;
    }

    for (var pos = 0; pos < BinBuffer.length; ) {
        if (BinBuffer.length - pos < 4) {
            break;
        }
        var Length = BinBuffer.readUInt32BE(pos);
        if (pos + Length > BinBuffer.length) {
            break;
        }
        var result   = JSON.parse(BinBuffer.slice(pos + 4, pos + Length).toString());
        var request  =
        {
            iRequestId : result.P_RequestId,
			sFuncName  : result.P_FuncName,
            Arguments  : result.P_Arguments
        };

        this.emit("message", request);
        pos += Length;
    }

    if (pos != BinBuffer.length) {
        this._data = new Buffer(BinBuffer.length - pos);
        BinBuffer.copy(this._data, 0, pos);
    }
}

/**
*Reset current protocol resolver
 */
stream.prototype.reset = function () {
    delete this._data;
    this._data = undefined;
}
```

The client uses the protocol resolver to call the code of the server:

```javascript
var Tars      = require("@tars/tars").client;
var Protocol = require("./ProtocolClient.js");

var prx      = Tars.stringToProxy(Tars.ServantProxy, "test@tcp -h 127.0.0.1 -p 14002 -t 60000");
prx.setProtocol(Protocol);
prx.rpc.createFunc("echo");

var success = function (result) {
    console.log("success");
    console.log("result.response.costtime:",  result.response.costtime);
    console.log("result.response.arguments:", result.response.arguments);
}

var error = function (result) {
    console.log("error");
    console.log("result.response.error.code:",    result.response.error.code);
    console.log("result.response.error.message:", result.response.error.message);
}

prx.rpc.echo("tencent", "mig", "abc").then(success, error);
```

In addition, if you want to send a request to a fixed machine according to a certain feature, you can use the following methods:

``` javascript
prx.getUsrName(param,{
    hashCode:userId
}).then(success, error).done();
```

After obtaining the client agent object, call the server interface function. At this time, you can pass in the hashcode parameter. Tars will assign the request to a fixed machine in the connection list according to the hashcode.

It should be noted that:

-The userid here is a number, binary, octal and hexadecimal are all OK, but the number converted to decimal is better below 16 digits. JavaScript processing high-precision numbers will have the problem of precision loss.

-When the server machine list is fixed, the same hashcode will be assigned to a fixed machine. When the server machine list changes, the machine corresponding to the hashcode will be reassigned.



##Tars as a third party agreement service



First, implement the RPC function processing class. Pay attention to the distribution logic of the framework:



A. If the function name passed from the client is a function of the processing class, then the framework calls the corresponding function in a limited way



B. If the function passed from the client is not a processing function, call the * * ` ondispatch ` * * function of the processing class, which is responsible for processing the request



C. If there is no ondispatch function, an error is reported

```javascript
//save as：EchoHandle.js
var Handle = function () {

}

Handle.prototype.initialize = function () { }
Handle.prototype.echo = function (current, v1, v2, v3) {
    console.log("EchoHandle.echo::", v1, v2, v3);

    current.sendResponse("TX", "TX-MIG");
}

Handle.prototype.onDispatch = function (v1, v2, v3) {
    console.log("EchoHandle.onDispatch::", v1, v2, v3);
}

module.exports = Handle;
```
Code example of server startup function:

```javascript
var Tars         = require("@tars/tars").server;
var Protocol    = require("./ProtocolClient.js");
var Handle      = require("./EchoHandle.js");

var svr = Tars.createServer(Handle);
svr.start({
    endpoint : "tcp -h 127.0.0.1 -p 14002 -t 10000",
    protocol : Protocol
});

```

##Tars client related parameters



When the tars client agent object calls the protocol interface function, the last parameter can be passed into a configuration object:



*Dying: Dye object. See [@ tar s / dying] (https://github.com/tar-node/dying) for details.

*Context: context object.

*Packettype: call type, 1 is one-way request, others are ordinary requests.

*Hashcode: request hash, and fill in the number within JavaScript precision security range (math.pow (2, 53) - 1)



An example of a case

``` javascript
prx.getUsrName(param,{
	dyeing:dyeingObj,
	context:{xxx:xxx},
	packetType:1,
    hashCode:userId
}).then(success, error);

```
###Set abnormal node shielding policy parameters



If the following conditions are met, the peer node will be considered abnormal:



*In 60 seconds, the number of timeout calls is greater than or equal to 2, and the timeout ratio is greater than 0.5



*More than 5 times of continuous timeout



Abnormal nodes will be masked and retried every 30 seconds. If successful, they will be recovered.



If you need to modify the shielding policy, you can call the 'setchecktimeoutinfo' method, as follows:



```javascript

proxy._worker.setCheckTimeoutInfo({

Mintimeoutinvoke: 2, / / minimum timeout for policy 1

Checktimeoutinterval: 60000, / / minimum time interval of policy 1, in MS

Frequencefailinvoke: 5, / / the number of consecutive timeouts for policy 2

Minfrequencefailtime: 5000, / / the minimum interval time of policy 2 (the minimum interval time from the 0th to the 5th timeout), in MS

Radio: 0.5, / / timeout ratio of policy 1

Trytimeinterval: 30000, / / exception node retry interval, in MS

Reconnectinterval: 60000 / / the interval between closing the connection and reconnecting if the connection succeeds but the retry fails
})
```
