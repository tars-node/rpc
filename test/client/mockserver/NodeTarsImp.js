// **********************************************************************
// Parsed By TarsParser(1.1.0), Generated By tars2node(20190529)
// TarsParser Maintained By <TARS> and tars2node Maintained By <superzheng>
// Generated from "NodeTars.tars" by Imp Mode
// **********************************************************************

"use strict";

var TRom = require("./NodeTars.js").TRom;
module.exports.TRom = TRom;

TRom.NodeTarsImp.prototype.initialize = function () {
    //TODO::
};

TRom.NodeTarsImp.prototype.test = function (current) {
    //TODO::
};

TRom.NodeTarsImp.prototype.testRpcCall = function (current, sUsrName, sValue) {
    current.sendResponse(current._endpoint.iPort, sUsrName);
};

TRom.NodeTarsImp.prototype.testContext = function (current) {
    if(current._origin.context.get("test") === "test"){
        current.sendResponse(0);
    } else {
        current.sendResponse(-1);
    }
};

