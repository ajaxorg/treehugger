require({baseUrl: "lib"}, ["treehugger/tree", "treehugger/traverse", "treehugger/js/parse", "treehugger/js/infer", "jquery"], function(tree, traverse, parsejs, infer) {
  


require.ready(function() {
  /*$("select#filepicker").change(function() {
    var url = $("select#filepicker").val();
    $.ajax({
      encoding: "text",
      url: url,
      success: function(data) {
        $("#code").val(data);
        $("#code").keyup();
      }
    });
  });*/
  var node, scope;
  $("#code").keyup(function() {
      var code = $("#code").val();
      node = parsejs.parse(code);
      //traverse.addParentPointers(node);
      scope = new infer.Scope();
      //scope.declare('$');
      //scope.vars.$.types = [new infer.FunctionType(['JQuery'])];
      infer.inferAllTypes(scope, node);
      var inferenceDemo = [];
      node.collectTopDown(
        "Var(name)", function(b) {
          inferenceDemo.push([b.name.value, this.meta.scope.inferValues(this)]);
        }
      );
      //console.log(node);
      $("#ast").val(node.toPrettyString());
      $("#outline").val(JSON.stringify(inferenceDemo, null, 2));
    });
  $("select#filepicker").change();
  $("#analyzebtn").click(function() {
    var resolvedNode = node.findNode($("#code")[0].selectionStart);
    $("#outline").val("Node: " + resolvedNode.toString() + "\nValue inference: " + JSON.stringify(scope.inferValues(resolvedNode), null, 2));
  });
  $("#code").keyup();
});
});

