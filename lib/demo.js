require({baseUrl: "lib"}, ["ast", "traversal", "js/parse", "js/types", "jquery"], function(ast, traversal, parsejs, types) {

function globalVars(n) {
  return n.collect("VarDecl(n, e)", "Function(nm, args, body)")
          .filter("VarDecl(nm, e)", function(b) { return b.nm; })
          .removeDuplicates();
}

require.ready(function() {
  if(localStorage.code) {
    $("#code").val(localStorage.code);
  }
  $("#code").keyup(function() {
      var code = $("#code").val();
      var a = parsejs.parse(code);
      $("#ast").val(a.toPrettyString());
      $("#outline").val(JSON.stringify(types.analyze(a), null, 2));
      $("#analysis").val(globalVars(a).toPrettyString());
      //$("#analysis").val(a.collect("Var(<nm>)").removeDuplicates().toPrettyString());
      //$("#outline").val(createOutline(a).toPrettyString());
      localStorage.code = code;
    });
  setTimeout(function() { $("#code").keyup(); }, 200);
});
});

