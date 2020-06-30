require("should");
var Protocol     = require("../../protal.js").rpcJson;
var Communicator = require("../../protal.js").Communicator;
var ServantProxy = require("../../protal.js").ServantProxy;
var TarsSvr      = require("../../protal.js").server;
var config       = require("./config.json")

describe("test-custom-protocal", function () {
    var server, communicator;
    before(function(done) {
        var EchoHandle = function () {}
        EchoHandle.prototype.initialize = function () {
            console.log("EchoHandle.prototype.initialize");
        }
        EchoHandle.prototype.echo = function (current, appBuffer) {
            current.sendResponse(appBuffer);
        }
        EchoHandle.prototype.doRequest = function ($current, $originRequest) {
            console.log("EchoHandle.doRequest::", $originRequest, arguments.length);
            current.sendResponse("timestamp:" + current.timestamp, "TX", "TX-MIG");
        }
        var option = new TarsSvr.BindAdapterOption();
        option.endpoint     = config.customserver.endpoint;
        option.protocolName = "json";
        option.protocol     = Protocol.server;
        option.handleImp    = EchoHandle;
        server = TarsSvr.createServer();
        server.start(option);

        communicator = Communicator.New();

        setTimeout(function () {
            done()
        },1000)
    })
    after(function() {
        communicator.destroy();
        server.stop();
    })

    it("1. test createFunc", function (done) {
        var prx = communicator.stringToProxy(ServantProxy, "test@" + config.customserver.endpoint);
        prx.setProtocol(Protocol.client);
        prx.rpc.createFunc("echo");
        prx.rpc.echo("test").then(function () {
            done()
        }).catch(function (err) {
            done(err.response? err.response.error : err);
        });
    })
    it("2. test rpc_call", function (done) {
        var prx = communicator.stringToProxy(ServantProxy, "test@" + config.customserver.endpoint);
        prx.setProtocol(Protocol.client);
        prx.rpc_call(1, "echo", "test").then(function () {
            done()
        }).catch(function (err) {
            done(err.response? err.response.error : err);
        });
    })
});