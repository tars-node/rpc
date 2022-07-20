var http = require('http');
var TarsServer = require("../../../../protal.js").server;
var TARS  = require("./NodeTarsImp.js").tars;

function StartHttpServer(endpoint){
    var httpServer = http.createServer((req, res) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Hello World\n');
    });
    httpServer.listen(endpoint.iPort, endpoint.sHost, () => {
        console.log(`Server running at http://${endpoint.sHost}:${endpoint.iPort}/`);
    });
}

var svr = TarsServer.createServer({
    "TarsDemo.NodeTarsServer.NodeTarsObj" : TARS.NodeTarsImp,
    "TarsDemo.NodeTarsServer.NodeHttpObj" : StartHttpServer
}, "./TARS.NodeTarsServer.config.conf");
svr.start();