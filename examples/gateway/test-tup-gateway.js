const http = require("http");
const TarsStream = require("@tars/stream");
const Hello = require("./Hello2Proxy.js").Hello;

class RequestGateway{
    /**
     * 访问网关服务
     * @param {*} host 网关服务host
     * @param {*} port 网关服务port
     * @param {*} path 网关path
     * @param {*} servantName 在GatewayServer中注册的名字，或者当启用auto_proxy时，填写真实的obj名
     * @param {*} funcName 被调函数名
     */
    constructor(host, port, path, servantName, funcName){
        this.options = {
            hostname : host,
            port     : port,
            path     : path,
            method   : "POST",
            headers  : {
                "Content-Type": "application/octet-stream",
                //'Content-Length': postData.length
            }
        }
        this.servantName = servantName
        this.funcName = funcName
    }

    encode(req){
        const tup = new TarsStream.Tup()
        //注意，网关只支持TUP_SIMPLE
        tup.tupVersion  = TarsStream.Tup.TUP_SIMPLE
        tup.servantName = this.servantName
        tup.funcName    = this.funcName
        const stReq = new Hello.AddReq()
        stReq.readFromObject({
            iNum1: req.iNum1 || 0,
            iNum2: req.iNum2 || 0,
            sMsg: req.sMsg || ""
        })
        tup.writeStruct("stReq", stReq)
        return tup.encode().toNodeBuffer()
    }

    async send(req){
        let postData = this.encode(req)
        this.options.headers["Content-Length"]  = postData.byteLength
        return await new Promise((resolve, reject)=>{
            const req = http.request(this.options,(res)=>{
                res.on("data", (chunk)=>{
                    //小回包示例
                    const data = new TarsStream.BinBuffer(new Buffer(chunk))
                    const tup  = new TarsStream.Tup();
                    tup.decode(data);
                    var stRsp = tup.readStruct("stRsp", Hello.AddRsp)
                    var ret = tup.readInt32("")
                    resolve({
                        return: ret,
                        stRsp: stRsp.toObject()
                    })
                })
            })
            req.on("error", reject)
            req.write(postData)
            req.end()
        })
        
    }
}

async function test(){
    const gateway = new RequestGateway("127.0.0.1", 3015, "/tup", "Hello.HelloServer2.HelloObj", "add")
    let rsp = await gateway.send({
        iNum1: 123,
        iNum2: 456,
        sMsg: "test tup gateway"
    })
    console.log(rsp)
}

test()