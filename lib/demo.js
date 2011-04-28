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
  // node[0][0][0][0][2][0][16][0][0][0][0].meta.scope.vars 88880
  window.getScope = function() { return scope; };
  window.getNode = function() { return node; };
  
  function resolve() {
    if(node) {
      var resolvedNode = node.findNode($("#code")[0].selectionStart);
      if(resolvedNode) {
        //var values = scope.inferValues(resolvedNode);
        $("#outline").val("Node: " + resolvedNode.toString() + "\nProperties: " + JSON.stringify(infer.getAllProperties(scope, resolvedNode), null, 2));// + "\Detailed inference: " + JSON.stringify(values, null, 2));
      }
    }
  }
  $("#code").keyup(function() {
      var code = $("#code").val();
      node = parsejs.parse(code);
      if(node) {
        scope = infer.createRootScope();
        infer.inferAllTypes(scope, node);
        $("#ast").val(node.toPrettyString());
        resolve();
      }
    });
  $("#code").mouseup(function() {
    resolve();
  });
  $("select#filepicker").change();
  $("#code").keyup();
});
});

