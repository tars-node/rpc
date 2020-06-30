require("should");
var Communicator = require("../../protal.js").Communicator;
var StartServer = require("./mockserver").StartServer;
var TRom = require("./mockserver/NodeTarsProxy").TRom;
var config = require("./config.json");

describe("test-rpc-call", function () {
    this.timeout(5000);
    var mockServers = [], communicator;
    before(function(done) {
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

    it("1. basic rpc call", function (done) {
        let obj = `${config.mockServer.servant}@${config.mockServer.activeEndpoints[0]}`
        var prx = communicator.stringToProxy(TRom.NodeTarsProxy, obj);
        prx.testRpcCall("test").then(function () {
            done();
        }).catch(function (err) {
            done(err.response.error)
        })
    })

    it("2. one way rpc call", function () {
        let obj = `${config.mockServer.servant}@${config.mockServer.activeEndpoints[0]}`
        var prx = communicator.stringToProxy(TRom.NodeTarsProxy, obj);
        prx.testRpcCall("test",{packetType:1}).should.be.rejected();
    })

    it("3. rpc call context", function (done) {
        let obj = `${config.mockServer.servant}@${config.mockServer.activeEndpoints[0]}`
        var prx = communicator.stringToProxy(TRom.NodeTarsProxy, obj);
        prx.testContext({context:{test: "test"}}).then(function (data) {
            data.response.return.should.equal(0)
            done()
        }).catch(function (err) {
            done(err.response? err.response.error : err);
        })
    })

    it("4. tup rpc call", function (done) {
        let obj = `${config.mockServer.servant}@${config.mockServer.activeEndpoints[0]}`
        var prx = communicator.stringToProxy(TRom.NodeTarsProxy, obj);
        prx.setVersion(2);
        prx.testRpcCall("test").then(function () {
            done()
        }).catch(function (err) {
            done(err.response.error)
        })
    })

    it("5. hash code", function (done) {
        let obj = `${config.mockServer.servant}@${config.mockServer.activeEndpoints[0]}:${config.mockServer.activeEndpoints[1]}`
        var prx = communicator.stringToProxy(TRom.NodeTarsProxy, obj);
        Promise.all([
            prx.testRpcCall("test", {hashCode:1}),
            prx.testRpcCall("test", {hashCode:1})
        ]).then(function (data) {
            var ret0 = data[0].response.return;
            var ret1 = data[1].response.return;
            ret0.should.equal(ret1);
            done();
        }).catch(function (err) {
            done(err.response? err.response.error : err);
        })
    })

    it("6. consistentHash hash", function (done) {
        let obj = `${config.mockServer.servant}@${config.mockServer.activeEndpoints[0]}:${config.mockServer.activeEndpoints[1]}`
        var prx = communicator.stringToProxy(TRom.NodeTarsProxy, obj, {bEnableConsistentHash:true});
        Promise.all([
            prx.testRpcCall("test", {consistentHash:"test consistentHash hash"}),
            prx.testRpcCall("test", {consistentHash:"test consistentHash hash"})
        ]).then(function (data) {
            var ret0 = data[0].response.return;
            var ret1 = data[1].response.return;
            ret0.should.equal(ret1);
            done()
        }).catch(function (err) {
            done(err.response? err.response.error : err);
        })
    })
});