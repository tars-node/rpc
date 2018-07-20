/**
 * Created by czzou on 2018/4/26.
 */
var createNodeBuffer = (function () {
    if ('allocUnsafe' in Buffer) {
        return function (data) {
            return Buffer.allocUnsafe(data);
        }
    } else {
        return function (data) {
            return new Buffer(data);
        }
    }
}());

module.exports = createNodeBuffer;