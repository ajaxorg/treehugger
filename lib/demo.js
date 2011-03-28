require({
      baseUrl: "lib"
    }, ["jquery", "ast", "traversal", "js/parse"], function(jquery, ast, traversal, parsejs) {
  
  var functionPattern = ast.parse("Function(<nm>, <args>, <body>)");
  var varDeclPattern  = ast.parse("VarDecl(<n>, <e>)");
  var varPattern      = ast.parse("Var(<n>)");

  function unusedArguments(a) {
    return a.collect(function() {
      var matches = functionPattern.match(this);
      if(!matches) return ast.fail();
      var unusedVars = matches.args.filter(function() {
        var arg = this;
        var uses = matches.body.collect(function() {
          return varPattern.match(this, {n: arg}) ? this : ast.fail();
        });
        return uses.isEmpty() ? arg : ast.fail();
      });
      return unusedVars.isEmpty() ? ast.fail() : ast.cons("UnusedArguments", [this[0], unusedVars]);
    });
  }
  
  function undeclaredVars(a) {
    return a.collect(function() {
      var matches = functionPattern.match(this);
      if(!matches) return ast.fail();
      var localVariables = matches.body.collect(function() {
        // Don't traverse into nested-functions
        if(functionPattern.match(this)) return this;
        var matches = varDeclPattern.match(this);
        return matches ? matches.n : ast.fail();
      }).concat(matches.args);
      var undeclared = matches.body.collect(function() {
        var matches = varPattern.match(this);
        if(!matches) return ast.fail();
        return localVariables.contains(matches.n) ? ast.fail() : this;
      });
      return undeclared.isEmpty() ? ast.fail() : ast.cons("UndeclaredVariables", [matches.nm, undeclared]);
    });
  }
  
  require.ready(function() {
    if(localStorage.code) {
      $("#code").val(localStorage.code);
    }
    $("#code").keyup(function() {
        var code = $("#code").val();
        var a = parsejs.parse(code);
        $("#analysis").val(unusedArguments(a).concat(undeclaredVars(a)).toPrettyString());
        $("#ast").val(a.toPrettyString());
        localStorage.code = code;
      });
    $("#code").keyup();
  });
});

