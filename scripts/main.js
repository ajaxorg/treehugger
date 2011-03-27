require(["jquery", "ast", "ast/traversal", "parsejs"], function(jquery, ast, traversal, parsejs) {
    //console.log(ast.parse('JSFunctionDecl("myFunction", [], [JSReturn(JSIntLit("8"))])').toPrettyString(""));
    function unUsedArguments(a) {
      var fnpat = ast.parse("Function(<nm>, <args>, <body>)");
      var varpat = ast.parse("Var(<n>)");
      a.alltd(function() {
          var matches = {};
          var r = fnpat.match(this, matches);
          if(r) {
            matches.args.forEach(function(arg) {
                var results = matches.body.collect(function(t) {
                    var matches2 = {n: arg};
                    return varpat.match(this, matches2) ? this : null;
                  });
                if(results.isEmpty()) {
                  console.log("Unused argument: ", arg.toString());
                }
              });
            return this;
          } else {
            return null;
          }
        });
    }
    require.ready(function() {
        if(localStorage["code"]) {
          $("#code").val(localStorage["code"]);
        }
        $("#code").keyup(function() {
            var code = $("#code").val();
            var a = parsejs.parse(code)
            unUsedArguments(a);
            $("#ast").val(a.toPrettyString(""));
            localStorage["code"] = code;
          });
        $("#code").keyup();
    });
});

