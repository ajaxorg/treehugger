require({baseUrl: "lib"}, ["treehugger/traverse", "treehugger/js/parse", "treehugger/js/types", "treehugger/js/infer", "jquery"], function(traverse, parsejs, types, infer) {

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
      traverse.addParentPointers(node);
      node.traverseTopDown("Var(_)", function() {
        infer.inferType(this);
      });
      console.log(node);
      $("#ast").val(node.toPrettyString());
      var obj = types.analyze(node);
      $("#outline").val(JSON.stringify(obj, null, 2));
    });
  $("select#filepicker").change();
  $("#code").keyup();
});
});

