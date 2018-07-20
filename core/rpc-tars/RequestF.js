var assert    = require("assert");
var TarsStream = require("@tars/stream");

var tars = tars || {};
module.exports.tars = tars;

tars.RequestPacket = function() {
    this.iVersion = 0;
    this.cPacketType = 0;
    this.iMessageType = 0;
    this.iRequestId = 0;
    this.sServantName = "";
    this.sFuncName = "";
    this.sBuffer = new TarsStream.BinBuffer;
    this.iTimeout = 0;
    this.context = new TarsStream.Map(TarsStream.String, TarsStream.String);
    this.status = new TarsStream.Map(TarsStream.String, TarsStream.String);
    this._classname = "tars.RequestPacket";
};
tars.RequestPacket._classname = "tars.RequestPacket";
tars.RequestPacket._write = function (os, tag, value) { os.writeStruct(tag, value); };
tars.RequestPacket._read  = function (is, tag, def) { return is.readStruct(tag, true, def); };
tars.RequestPacket._readFrom = function (is) {
    var tmp = new tars.RequestPacket();
    tmp.iVersion = is.readInt16(1, true, 0);
    tmp.cPacketType = is.readInt8(2, true, 0);
    tmp.iMessageType = is.readInt32(3, true, 0);
    tmp.iRequestId = is.readInt32(4, true, 0);
    tmp.sServantName = is.readString(5, true, "");
    tmp.sFuncName = is.readString(6, true, "");
    tmp.sBuffer = is.readBytes(7, true, TarsStream.BinBuffer);
    tmp.iTimeout = is.readInt32(8, true, 0);
    tmp.context = is.readMap(9, true, TarsStream.Map(TarsStream.String, TarsStream.String));
    tmp.status = is.readMap(10, true, TarsStream.Map(TarsStream.String, TarsStream.String));
    return tmp;
};
tars.RequestPacket.prototype._writeTo = function (os) {
    os.writeInt16(1, this.iVersion);
    os.writeInt8(2, this.cPacketType);
    os.writeInt32(3, this.iMessageType);
    os.writeInt32(4, this.iRequestId);
    os.writeString(5, this.sServantName);
    os.writeString(6, this.sFuncName);
    os.writeBytes(7, this.sBuffer);
    os.writeInt32(8, this.iTimeout);
    os.writeMap(9, this.context);
    os.writeMap(10, this.status);
};
tars.RequestPacket.prototype._equal = function () {
    assert.fail("this structure not define key operation");
};
tars.RequestPacket.prototype._genKey = function () {
    if (!this._proto_struct_name_) {
        this._proto_struct_name_ = "STRUCT" + Math.random();
    }
    return this._proto_struct_name_;
};
tars.RequestPacket.prototype.toObject = function() {
    return {
        "iVersion" : this.iVersion,
        "cPacketType" : this.cPacketType,
        "iMessageType" : this.iMessageType,
        "iRequestId" : this.iRequestId,
        "sServantName" : this.sServantName,
        "sFuncName" : this.sFuncName,
        "sBuffer" : this.sBuffer.toObject(),
        "iTimeout" : this.iTimeout,
        "context" : this.context.toObject(),
        "status" : this.status.toObject()
    };
};
tars.RequestPacket.prototype.readFromObject = function(json) {
    json.hasOwnProperty("iVersion") && (this.iVersion = json.iVersion);
    json.hasOwnProperty("cPacketType") && (this.cPacketType = json.cPacketType);
    json.hasOwnProperty("iMessageType") && (this.iMessageType = json.iMessageType);
    json.hasOwnProperty("iRequestId") && (this.iRequestId = json.iRequestId);
    json.hasOwnProperty("sServantName") && (this.sServantName = json.sServantName);
    json.hasOwnProperty("sFuncName") && (this.sFuncName = json.sFuncName);
    json.hasOwnProperty("sBuffer") && (this.sBuffer.readFromObject(json.sBuffer));
    json.hasOwnProperty("iTimeout") && (this.iTimeout = json.iTimeout);
    json.hasOwnProperty("context") && (this.context.readFromObject(json.context));
    json.hasOwnProperty("status") && (this.status.readFromObject(json.status));
};
tars.RequestPacket.prototype.toBinBuffer = function () {
    var os = new TarsStream.TarsOutputStream();
    this._writeTo(os);
    return os.getBinBuffer();
};
tars.RequestPacket.new = function () {
    return new tars.RequestPacket();
};
tars.RequestPacket.create = function (is) {
    return tars.RequestPacket._readFrom(is);
};

tars.ResponsePacket = function() {
    this.iVersion = 0;
    this.cPacketType = 0;
    this.iRequestId = 0;
    this.iMessageType = 0;
    this.iRet = 0;
    this.sBuffer = new TarsStream.BinBuffer;
    this.status = new TarsStream.Map(TarsStream.String, TarsStream.String);
    this.sResultDesc = "";
    this.context = new TarsStream.Map(TarsStream.String, TarsStream.String);
    this._classname = "tars.ResponsePacket";
};
tars.ResponsePacket._classname = "tars.ResponsePacket";
tars.ResponsePacket._write = function (os, tag, value) { os.writeStruct(tag, value); };
tars.ResponsePacket._read  = function (is, tag, def) { return is.readStruct(tag, true, def); };
tars.ResponsePacket._readFrom = function (is) {
    var tmp = new tars.ResponsePacket();
    tmp.iVersion = is.readInt16(1, true, 0);
    tmp.cPacketType = is.readInt8(2, true, 0);
    tmp.iRequestId = is.readInt32(3, true, 0);
    tmp.iMessageType = is.readInt32(4, true, 0);
    tmp.iRet = is.readInt32(5, true, 0);
    tmp.sBuffer = is.readBytes(6, true, TarsStream.BinBuffer);
    tmp.status = is.readMap(7, true, TarsStream.Map(TarsStream.String, TarsStream.String));
    tmp.sResultDesc = is.readString(8, false, "");
    tmp.context = is.readMap(9, false, TarsStream.Map(TarsStream.String, TarsStream.String));
    return tmp;
};
tars.ResponsePacket.prototype._writeTo = function (os) {
    os.writeInt16(1, this.iVersion);
    os.writeInt8(2, this.cPacketType);
    os.writeInt32(3, this.iRequestId);
    os.writeInt32(4, this.iMessageType);
    os.writeInt32(5, this.iRet);
    os.writeBytes(6, this.sBuffer);
    os.writeMap(7, this.status);
    os.writeString(8, this.sResultDesc);
    os.writeMap(9, this.context);
};
tars.ResponsePacket.prototype._equal = function () {
    assert.fail("this structure not define key operation");
};
tars.ResponsePacket.prototype._genKey = function () {
    if (!this._proto_struct_name_) {
        this._proto_struct_name_ = "STRUCT" + Math.random();
    }
    return this._proto_struct_name_;
};
tars.ResponsePacket.prototype.toObject = function() {
    return {
        "iVersion" : this.iVersion,
        "cPacketType" : this.cPacketType,
        "iRequestId" : this.iRequestId,
        "iMessageType" : this.iMessageType,
        "iRet" : this.iRet,
        "sBuffer" : this.sBuffer.toObject(),
        "status" : this.status.toObject(),
        "sResultDesc" : this.sResultDesc,
        "context" : this.context.toObject()
    };
};
tars.ResponsePacket.prototype.readFromObject = function(json) {
    json.hasOwnProperty("iVersion") && (this.iVersion = json.iVersion);
    json.hasOwnProperty("cPacketType") && (this.cPacketType = json.cPacketType);
    json.hasOwnProperty("iRequestId") && (this.iRequestId = json.iRequestId);
    json.hasOwnProperty("iMessageType") && (this.iMessageType = json.iMessageType);
    json.hasOwnProperty("iRet") && (this.iRet = json.iRet);
    json.hasOwnProperty("sBuffer") && (this.sBuffer.readFromObject(json.sBuffer));
    json.hasOwnProperty("status") && (this.status.readFromObject(json.status));
    json.hasOwnProperty("sResultDesc") && (this.sResultDesc = json.sResultDesc);
    json.hasOwnProperty("context") && (this.context.readFromObject(json.context));
};
tars.ResponsePacket.prototype.toBinBuffer = function () {
    var os = new TarsStream.TarsOutputStream();
    this._writeTo(os);
    return os.getBinBuffer();
};
tars.ResponsePacket.new = function () {
    return new tars.ResponsePacket();
};
tars.ResponsePacket.create = function (is) {
    return tars.ResponsePacket._readFrom(is);
};




