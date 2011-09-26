require("../../requirejs-node");
require.paths.unshift(__dirname + "/../..");

var parser = require("treehugger/js/parse-uglify");
var assert = require("assert");
//var microtime = require('microtime');

module.exports = {
    "test basic parsing" : function() {
        assert.equal(parser.parse("hello()").toString(), '[Call(Var("hello"),[])]');
        assert.equal(parser.parse("if(true) a = 8;").toString(), '[If(Var("true"),Assign(Var("a"),Num("8")),None())]');
    },
    "test parse jquery": function() {
        return;
        var code = require('fs').readFileSync('lib/jquery.js', 'ascii');
        //var now = microtime.now();
        parser.parse(code);
        //console.log("Parsing jQuery took: " + (microtime.now() - now)/1000 + "ms");
    },
    "test parse narcissus": function() {
        return;
        var code = require('fs').readFileSync('support/narcissus/lib/jsdecomp.js', 'ascii');
        code += require('fs').readFileSync('support/narcissus/lib/jsbrowser.js', 'ascii');
        code += require('fs').readFileSync('support/narcissus/lib/jsdefs.js', 'ascii');
        code += require('fs').readFileSync('support/narcissus/lib/jsdesugar.js', 'ascii');
        code += require('fs').readFileSync('support/narcissus/lib/jslex.js', 'ascii');
        code += require('fs').readFileSync('support/narcissus/lib/jsparse.js', 'ascii');
        //var now = microtime.now();
        parser.parse(code);
        //console.log("Parsing jQuery took: " + (microtime.now() - now)/1000 + "ms");
    }
};

if (typeof module !== "undefined" && module === require.main) {
    require("asyncjs").test.testcase(module.exports).exec()
}