require("../../requirejs-node");
require.paths.unshift(__dirname + "/../..");

var parser = require("treehugger/js/parse");
var assert = require("assert");
//var microtime = require('microtime');

module.exports = {
    "test basic parsing" : function() {
        assert.equal(parser.parse("hello()").toString(), '[Call(Var("hello"),[])]');
        assert.equal(parser.parse("if(true) a = 8;").toString(), '[If(Var("true"),Assign(Var("a"),Num("8")),None())]');
    },
    "test parse jquery": function() {
        var code = require('fs').readFileSync('lib/jquery.js', 'ascii');
        //var now = microtime.now();
        parser.parse(code);
        //console.log("Parsing jQuery took: " + (microtime.now() - now)/1000 + "ms");
    },
    "test parse treehugger": function() {
        var code = require('fs').readFileSync('lib/treehugger/traverse.js', 'ascii');
        code += require('fs').readFileSync('lib/treehugger/tree.js', 'ascii');
        code += require('fs').readFileSync('lib/treehugger/uglifyparser.js', 'ascii');
        code += require('fs').readFileSync('lib/treehugger/uglifyparser.js', 'ascii');
        code += require('fs').readFileSync('lib/treehugger/js/infer.js', 'ascii');
        //var now = microtime.now();
        parser.parse(code);
        //console.log("Parsing jQuery took: " + (microtime.now() - now)/1000 + "ms");
    }
};

if (typeof module !== "undefined" && module === require.main) {
    require("asyncjs").test.testcase(module.exports).exec()
}