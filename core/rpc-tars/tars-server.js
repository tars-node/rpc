/**
 * 使用tars数据格式作为RPC协议的服务端协议解析器
 */
var EventEmitter = require("events").EventEmitter;
var util         = require("util");
var TarsStream          = require("@tars/stream");
var TarsPacket    = require("./RequestF.js").tars;
var CreateNodeBuffer = require("./CreateNodeBuffer");

var stream = function () {
    EventEmitter.call(this);

    this._name      = "tars";
    this._data = [];
    this._bufferLength = 0;
}
util.inherits(stream, EventEmitter);
stream.prototype.__defineGetter__("name", function () { return this._name; });

module.exports = stream;

/**
 * 服务端的打包代码
 *
 * 根据传入数据进行打包的方法
 */
stream.prototype.compose = function ($protoMessage) { //$protoMessage的结构参考tars-rpc模块中的ProtoMessage结构体
    return ($protoMessage.origin.iVersion == 2 || $protoMessage.origin.iVersion == 3)?this.composeTUP($protoMessage):this.composeTARS($protoMessage);
}

stream.prototype.composeTARS = function ($protoMessage) {
    //01 根据上层协议知道，客户端采用tars格式进行编解码，此时按照tars格式处理数据
    var response = new TarsPacket.ResponsePacket();
    response.iVersion     = $protoMessage.origin.iVersion || 1;
    response.cPacketType  = 0;
    response.iMessageType = $protoMessage.origin.iMessageType;
    response.iRequestId   = $protoMessage.origin.iRequestId;
    response.sBuffer      = $protoMessage.appBuffer?$protoMessage.appBuffer:response.sBuffer; //兼容老版本
    response.iRet         = $protoMessage.iResultCode;          //框架层的错误代码
    response.sResultDesc  = $protoMessage.sResultDesc;          //框架层的错误消息

    if ($protoMessage.property && $protoMessage.property.context) { //服务端需要返回附加数据
        for (var key in $protoMessage.property.context) {
            response.context.insert(key.toString(), $protoMessage.property.context[key].toString());
        }
    }

    //02 将TarsPacket.ResponsePacket打包
    var os = new TarsStream.TarsOutputStream();
    os.setHeaderLength(0);
    response._writeTo(os);
    os.setHeaderLength(os.getBinBuffer().length);

    return os.getBinBuffer().toNodeBuffer();
}

stream.prototype.composeTUP = function ($protoMessage) {
    //根据上层协议知道，客户端采用tup格式进行编解码，此时按照tup格式处理数据
    var response = new TarsPacket.RequestPacket();
    response.iVersion     = $protoMessage.origin.iVersion;
    response.cPacketType  = 0;
    response.iMessageType = $protoMessage.origin.iMessageType;
    response.iRequestId   = $protoMessage.origin.iRequestId;
    response.sServantName = $protoMessage.origin.sServantName;
    response.sFuncName    = $protoMessage.origin.sFuncName;
    response.sBuffer      = $protoMessage.appBuffer;

    response.status.insert("STATUS_RESULT_CODE", $protoMessage.iResultCode.toString());     //框架层的错误代码
    response.status.insert("STATUS_RESULT_DESC", $protoMessage.sResultDesc);                //框架层的错误消息

    if ($protoMessage.appBuffer === undefined || $protoMessage.appBuffer.length === 0) {
        var attr = new TarsStream.UniAttribute();
        attr.tupVersion  = $protoMessage.origin.iVersion;
        response.sBuffer = attr.encode();
    }

    //将TarsPacket.RequestPacket打包
    var os = new TarsStream.TarsOutputStream();
    os._binBuffer.writeInt32(0);
    response._writeTo(os);

    var lenBuffer = new Buffer(4);
    lenBuffer.writeInt32BE(os.getBinBuffer().length, 0);
    os._binBuffer.replace(lenBuffer, 0, 4);

    return os.getBinBuffer().toNodeBuffer();
}

/**
 * 服务端的解包代码
 *
 * 网络收取包之后，填入数据判断是否完整包
 */
var ProtoMessageRequest = function () {
    this.origin       = undefined;
    this.sFuncName    = undefined;
    this.iResultCode  =  0;
    this.sResultDesc  = "";
}

stream.prototype.feed = function (data) {
    if (this._bufferLength < 4 && this._data.length > 0) {
        this._data[0] = Buffer.concat([this._data[0], data]);
    } else {
        this._data.push(data);
    }
    this._bufferLength += data.length;

    if (this._bufferLength > 4) {
        var Length = this._data[0].readUInt32BE(0);
        if (Length <= this._bufferLength) {
            var BinBuffer = Buffer.concat(this._data, this._bufferLength)
            for (var pos = 0; pos < BinBuffer.length; ) {

                //已经发现一个完整的请求包，现在开始解包
                var is      = new TarsStream.TarsInputStream(new TarsStream.BinBuffer(BinBuffer.slice(pos + 4, pos + Length)));
                var message = new ProtoMessageRequest();
                message.iResultCode =  0;
                message.sResultDesc = "";
                try{
                    message.origin      = TarsPacket.RequestPacket._readFrom(is);
                } catch(e) {
                    console.error("[TARS]packet error");
                    this.emit("error", e);
                    return
                }
                message.sFuncName   = message.origin.sFuncName;

                //解包成功，将这个请求抛给上层框架，让框架去做分发
                this.emit("message", message);
                pos += Length;

                if (BinBuffer.length - pos < 4) {
                    break;
                }
                Length = BinBuffer.readUInt32BE(pos);
                if (pos + Length > BinBuffer.length) {
                    break;
                }
            }

            if (pos != BinBuffer.length) {
                var tmp = CreateNodeBuffer(BinBuffer.length - pos);
                BinBuffer.copy(tmp, 0, pos);
                this._data = [tmp];
                this._bufferLength = tmp.length;
            } else {
                this._data = [];
                this._bufferLength = 0;
            }
        }
    }
}

/**
 * 重置当前协议解析器
 */
stream.prototype.reset = function () {
    delete this._data;
    this._data = [];
    this._bufferLength = 0;
}
