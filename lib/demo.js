require({
    baseUrl: "lib"
}, ["treehugger/tree", "treehugger/traverse", "treehugger/js/parse", "treehugger/js/infer", "jquery"], function(tree, traverse, parsejs, infer) {

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
        return {line: line, col: col};
    }
    
    var node, scope;

    function resolve() {
        if(node) {
            var pos = $("#code")[0].selectionStart;
            var code = $("#code").val();
            
            var resolvedNode = node.findNode(posToLineCol(code, pos));
            if(!resolvedNode) {
                $("#outline").val("Could not resolve node");
                return;
            }
            var info = {};
            scope.inferValues(resolvedNode).forEach(function(val) {
                info = infer.retrieveValueInfo(val) || info;
            });
            $("#outline").val("Node: " + resolvedNode.toString() +
                             "\nProperties: " + JSON.stringify(infer.getAllProperties(scope, resolvedNode), null, 2) +
                             "\nInfo: " + JSON.stringify(info));
        }
    }
    require.ready(function() {
        $.getJSON("lib/treehugger/js/builtin.json", function(builtins) {
            $("#code").keyup(function() {
                var code = $("#code").val();
                node = parsejs.parse(code);
                scope = infer.createRootScope(builtins);
                infer.inferAllTypes(scope, node);
    
                $("#ast").text(node.toPrettyString());
                resolve();
            });
            $("#code").mouseup(function() {
                resolve();
            });
            $("select#filepicker").change();
            $("#code").keyup();
        });
    });
});