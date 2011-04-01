require({baseUrl: "lib"}, ["ast", "traversal", "js/parse", "js/types", "jquery"], function(ast, traversal, parsejs, types) {

require.ready(function() {
  $("select#filepicker").change(function() {
    var url = $("select#filepicker").val();
    $.ajax({
      encoding: "text",
      url: url,
      success: function(data) {
        $("#code").val(data);
        $("#code").keyup();
      }
    });
  });
  $("#code").keyup(function() {
      var code = $("#code").val();
      var a = parsejs.parse(code);
      $("#ast").val(a.toPrettyString());
      var obj = types.analyze(a);
      console.log(obj);
      $("#outline").val(JSON.stringify(obj, null, 2));
    });
  $("select#filepicker").change();
});
});

