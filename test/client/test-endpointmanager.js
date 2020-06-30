require("should")
var Communicator = require("../../protal.js").Communicator;
var AdapterProxy = require("../../core/client/AdapterProxy.js").AdapterProxy;
var ReqMessage = require("../../core/client/ReqMessage.js").ReqMessage;
var StartLocator = require("./locator");
var StartServer = require("./mockserver").StartServer;
var TRom = require("./mockserver/NodeTarsProxy").TRom;
var config       = require("./config.json")

describe("test-endpointmanager", function () {
    this.timeout(0);
    var locator, mockServers = [], communicator;

    before(function(done) {
        locator = StartLocator();
        mockServers = config.mockServer.activeEndpoints.map((item)=>{
            return StartServer({
                servant: config.mockServer.servant,
                endpoint: item
            });
        })
        setTimeout(function(){
            done()
        }, 1000)
    })
    after(function() {
        locator.stop();
        mockServers.forEach((server)=>{
            server.stop()
        })
    })
    beforeEach(function() {
        communicator = Communicator.New();
    })

    afterEach(function() {
        communicator.destroy();
    })

    it("1. test call locator", function (done) {
        communicator.setProperty("locator", `${config.locator.servant}@${config.locator.endpoint}`);
        var prx = communicator.stringToProxy(TRom.NodeTarsProxy, config.mockServer.servant);
        Promise.all([
            prx.testRpcCall("test"),
            prx.testRpcCall("test")
        ]).then(function (data) {
            var ret0 = data[0].response.return;
            var ret1 = data[1].response.return;
            ret0.should.not.equal(ret1);
            done();
        }).catch(function (err) {
            done(err.response? err.response.error : err);
        })
    })

    it("2. test dns", function (done) {
        communicator.setProperty("locator", `${config.locator.servant}@${config.locator.endpoint}`);
        var prx = communicator.stringToProxy(TRom.NodeTarsProxy, config.mockServer.servant);
        var manager = prx._worker._manager;
        manager._dns();
        setTimeout(function () {
            manager.getAllAdapters().length.should.equal(2)
            done()
        },200)
    })
    it("3. test doEndpointsException", function (done) {
        communicator.setProperty("locator", "Test.test.locatorObj@tcp -h 127.0.0.2 -p 14005 -t 10000");
        var prx = communicator.stringToProxy(TRom.NodeTarsProxy, config.mockServer.servant);
        var manager = prx._worker._manager;
        manager._dns();
        setTimeout(function () {
            manager._adapters.length.should.equal(0)
            done()
        },200)
    })
    it("4. test selectAdapterProxy", function (done) {
        communicator.setProperty("locator", `${config.locator.servant}@${config.locator.endpoint}`);
        var prx = communicator.stringToProxy(TRom.NodeTarsProxy, config.mockServer.servant);
        var manager = prx._worker._manager;
        manager._dns();
        setTimeout(function () {
            var message = new ReqMessage();
            message.request.property = {};
            (manager.selectAdapterProxy(message) instanceof AdapterProxy).should.equal(true);
            done()
        },200)
    })
});


