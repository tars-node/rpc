var util = require("util");

function RpcCallError(error){
    this.request  = error.request;
    this.response = error.response;
    this.error    = error.error;
}

util.inherits(RpcCallError, Error);
module.exports.RpcCallError = RpcCallError;