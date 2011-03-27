require(["jquery", "ast", "ast/traversal", "parsejs"], function(jquery, ast, traversal, parsejs) {
    //console.log(ast.parse('JSFunctionDecl("myFunction", [], [JSReturn(JSIntLit("8"))])').toPrettyString(""));
    function unUsedArguments(a) {
      var fnpat = ast.parse("Function(<nm>, <args>, <body>)");
      var varpat = ast.parse("Var(<n>)");
      a.collect(function() {
        var matches = {};
        var r = fnpat.match(this, matches);
        if(r) {
          var unusedVars = matches.args.filter(function() {
            var arg = this;
            var uses = matches.body.collect(function() {
              var matches2 = {n: arg};
              return varpat.match(this, matches2) ? this : new ast.FailNode(this);
            });
            if(uses.isEmpty()) {
              return arg;
            } else {
              return new ast.FailNode(arg);
            }
          });
          if(!unusedVars.isEmpty()) {
            return new ast.ListNode([this.children[0], unusedVars]);
          } else {
            return new ast.FailNode(this);
          }
        } else {
          return new ast.FailNode(this);
        }
      })
      .debug(true);
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

