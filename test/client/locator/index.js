var TarsSvr = require("../../../protal.js").server;
var tars    = require("./QueryF.js").tars;
var config  = require("../config.json")

function StartLocator(){
    var option = new TarsSvr.BindAdapterOption();
    option.endpoint  = config.locator.endpoint;
    option.name      = "locator";
    option.servant   = config.locator.servant;
    option.handleImp = tars.QueryFImp;
    var svr = TarsSvr.createServer();
    svr.start(option);
    return svr;
}

module.exports = StartLocator