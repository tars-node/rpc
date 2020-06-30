/**
 * 使用tars编码数据格式作为RPC协议的客户端协议解析器
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
    this._version = 1;
}
util.inherits(stream, EventEmitter);

stream.prototype.__defineGetter__("name", function () { return this._name; });

module.exports = stream;

/**
 * 根据传入数据进行打包的方法
 * @param request
 * request.iRequestId : 框架生成的请求序列号
 * request.sFuncName  : 函数名称
 * request.sBuffer    : 函数传入的打包数据
 */
stream.prototype.compose = function ($protoMessage) {
    var option = {};
    var packetType = 0, iVersion = 1;;
    if($protoMessage && $protoMessage.property)
    {
        option = $protoMessage.property;
        if(option && option.packetType && option.packetType === 1){
            packetType = 1;
        }
        if(option.iVersion && (option.iVersion === TarsStream.Tup.TUP_SIMPLE || option.iVersion === TarsStream.Tup.TUP_COMPLEX)){
            iVersion = option.iVersion;
        }
    }

    var req = new TarsPacket.RequestPacket();
    req.iVersion        = iVersion;
    req.cPacketType     = packetType;
    req.iMessageType    = 0;
    req.iTimeout        = $protoMessage.iTimeout || 0;
    req.iRequestId      = $protoMessage.iRequestId;
    req.sServantName    = $protoMessage.sServantName;
    req.sFuncName       = $protoMessage.sFuncName;
    req.sBuffer         = $protoMessage.appBuffer;

    //设置染色以及context等属性
    if ($protoMessage.property && $protoMessage.property.dyeing && $protoMessage.property.dyeing.dyeing) {
        req.iMessageType = req.iMessageType | 0x04;
        req.status.insert("STATUS_DYED_KEY", ($protoMessage.property.dyeing.key || '').toString());
    }
    if ($protoMessage.property && $protoMessage.property.context) {
        for (var key in $protoMessage.property.context) {
            req.context.insert(key, ($protoMessage.property.context[key] || '').toString());
        }
    }

    //对请求结构体打包
    var os = new TarsStream.TarsOutputStream();
    os.setHeaderLength(0);
    req._writeTo(os);
    os.setHeaderLength(os.getBinBuffer().length);

    return os.getBinBuffer().toNodeBuffer();
}

/**
 * 网络收取包之后，填入数据判断是否完整包
 */
var ProtoMessageResponse = function () {
    this.origin       = undefined;   //原始的请求结构体,从协议中解出来的第一层结构体
    this.iRequestId   = 0;
    this.iResultCode  = 0;           //tars框架的错误代码
    this.sResultDesc  = "";          //tars框架的错误消息
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
        //确保了一个完整的tars数据包
        if (Length <= this._bufferLength) {
            var BinBuffer = Buffer.concat(this._data, this._bufferLength)
            for (var pos = 0; pos < BinBuffer.length; ) {

                var is      = new TarsStream.TarsInputStream(new TarsStream.BinBuffer(BinBuffer.slice(pos + 4, pos + Length)));
                var message = new ProtoMessageResponse();
                if(this._version === TarsStream.Tup.TUP_SIMPLE || this._version === TarsStream.Tup.TUP_COMPLEX){
                    message.origin      = TarsPacket.RequestPacket._readFrom(is);
                    message.iRequestId  = message.origin.iRequestId;
                    var tup = new TarsStream.UniAttribute();
                    tup.tupVersion = message.origin.iVersion;
                    tup.decode(message.origin.sBuffer);

                    var iResultCode = message.origin.status.get("STATUS_RESULT_CODE");
                    iResultCode = iResultCode === undefined ? 0 : parseInt(iResultCode);
                    message.iResultCode = iResultCode;
                    message.origin.tup = tup;
                    message.origin.iRet = iResultCode;
                    message.origin.sBuffer = undefined;
                } else {
                    message.origin      = TarsPacket.ResponsePacket._readFrom(is);
                    message.iRequestId  = message.origin.iRequestId;
                    message.iResultCode = message.origin.iRet;
                    message.sResultDesc = message.origin.sResultDesc;
                }
                

                this.emit("message", message);
                pos += Length;

                //开始尝试第二个tars数据包的读取
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

stream.prototype.reset = function () {
    delete this._data;
    this._data = [];
    this._bufferLength = 0;
}
