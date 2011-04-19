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
  $("#code").keyup(function() {
      var code = $("#code").val();
      var node = parsejs.parse(code);
      //traverse.addParentPointers(node);
      var scope = new infer.Scope();
      scope.declare('$');
      scope.vars.$.types = [new infer.FunctionType(['JQuery'])];
      infer.inferAllTypes(scope, node);
      var inferenceDemo = [];
      node.collectTopDown(
        "Var(name)", function(b) {
          inferenceDemo.push({"var": b.name.value, type: this.meta.scope.inferType(this)});
        },
        "Function(name, fargs, _)", function(b) {
          var scope = this.meta.scope;
          var fargs = {};
          b.fargs.each(function() {
            fargs[this.value] = scope.inferTypeVar(this.value);
          });
          inferenceDemo.push({"function": b.name.value, fargs: fargs, returnType: scope.inferTypeVar('__return')});
        });
      //console.log(node);
      $("#ast").val(node.toPrettyString());
      $("#outline").val(JSON.stringify(scope, null, 2) + "\n== INFERENCE DEMO ==\n" + JSON.stringify(inferenceDemo, null, 2));
    });
  $("select#filepicker").change();
  $("#code").keyup();
});
});

