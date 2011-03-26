require(["jquery", "ast", "ast/traversal", "parsejs"], function(jquery, ast, traversal, parsejs) {
    //console.log(ast.parse('JSFunctionDecl("myFunction", [], [JSReturn(JSIntLit("8"))])').toPrettyString(""));
    function unUsedArguments(a) {
      var fnpat = ast.parse("Function(<nm>, <args>, <body>)");
      var varpat = ast.parse("Var(<n>)");
      traversal.alltd(function(t) {
          var matches = {};
          var r = fnpat.match(t, matches);
          if(r) {
            matches.args.forEach(function(arg) {
                var results = traversal.collect(function(t) {
                    var matches2 = {n: arg};
                    if(varpat.match(t, matches2)) {
                      return t;
                    } else {
                      return null;
                    }
                  }, matches.body);
                if(results.isEmpty()) {
                  console.log("Unused argument: ", arg.toString());
                }
              });
            return t;
          } else {
            return null;
          }
        }, a);
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

