require({
    baseUrl: "lib"
}, ["treehugger/tree", "treehugger/traverse", "treehugger/js/parse", "jquery"], function(tree, traverse, parsejs) {

  function log(message) {
    $("#output").val($("#output").val() + message + "\n");
  }

  function exec() {
    var js = $("#code").val();
    var analysisJs = $("#analysis").val();
    $("#output").val("");
    var ast = parsejs.parse(js);
    $("#ast").val(ast.toPrettyString());
    try {
      eval(analysisJs);
    } catch(e) {
      $("#output").val("JS Error");
      console.log(e.message)
    }
  }

  tree.Node.prototype.log = function() {
    $("#output").val(this.toPrettyString());
  }

    require.ready(function() {
        $("#code").keyup(exec);
        $("#runbutton").click(exec);
        exec();
    });
});
