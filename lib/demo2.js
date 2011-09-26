require({
    baseUrl: "lib"
}, ["treehugger/tree", "treehugger/traverse", "treehugger/js/parse-uglify", "treehugger/js/infer", "jquery"], function(tree, traverse, parsejs, infer) {

    function posToLineCol(code, pos) {
        var line = 0;
        var col = 0;
        for (var i = 0; i < code.length && i < pos; i++) {
            if(code[i] === "\n") {
                line++;
                col = 0;
            } else {
                col++;
            }
        }
        console.log("Clicked location: ", line, col);
        return {line: line, col: col};
    }
    
    var node;

    function resolve() {
        if(node) {
            var pos = $("#code")[0].selectionStart;
            var code = $("#code").val();
            
            var resolvedNode = node.findNode(posToLineCol(code, pos));
            console.log("Node: ", resolvedNode.toString());
        }
    }
    require.ready(function() {
        $("#code").keyup(function() {
            console.log("Here!");
            var code = $("#code").val();
            node = parsejs.parse(code);
            console.log(node);
            $("#ast").text(node.toPrettyString());
        });
        $("#code").mouseup(function() {
            resolve();
        });
        $("select#filepicker").change();
        $("#code").keyup();
    });
});