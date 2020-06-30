var path = require("path")
var TarsSvr = require("../../../protal.js").server;
var TRom   = require("./NodeTarsImp.js").TRom;

function StartServer(options){
    var option = new TarsSvr.BindAdapterOption();
    option.endpoint  = options.endpoint;
    option.name      = "TRom.NodeTarsServer.NodeTarsObjAdapter";
    option.servant   = options.servant;
    option.handleImp = TRom.NodeTarsImp;
    var svr = TarsSvr.createServer();
    svr.start(option);
    return svr;
}

module.exports = {
    StartServer     : StartServer
}