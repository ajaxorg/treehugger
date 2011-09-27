require("../requirejs-node");
require.paths.unshift(__dirname + "/..");

var parser = require("treehugger/uglifyparser");
//var microtime = require('microtime');

module.exports = {
    "test basic parsing" : function() {
        var result = parser.parse("console.log('hello');", false, true);
    },
};

if (typeof module !== "undefined" && module === require.main) {
    require("asyncjs").test.testcase(module.exports).exec()
}