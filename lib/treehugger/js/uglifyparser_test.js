require("../../requirejs-node");
require.paths.unshift(__dirname + "/../..");

if (typeof module !== "undefined" && module === require.main) {
    require("asyncjs").test.testcase(require("treehugger/js/parse_test")).exec()
}