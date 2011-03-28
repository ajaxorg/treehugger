require({baseUrl: "lib"}, ["ast", "traversal", "js/parse", "jquery"], function(ast, traversal, parsejs) {

var functionPattern = ast.parse("Function(<nm>, <args>, <body>)");
var varDeclPattern  = ast.parse("VarDecl(<n>, <e>)");
var varPattern      = ast.parse("Var(<n>)");
var assFunPattern   = ast.parse("Assign(<nm>, Function(<ignore>, <args>, <body>))");
var varFunPattern   = ast.parse("VarDecl(<nm>, Function(<ignore>, <args>, <body>))");
var propPattern     = ast.parse("PropAccess(<obj>, <f>)");

function ppJs(a) {
  var matches = propPattern.match(a);
  if(matches) return ppJs(matches.obj) + "." + matches.f.s;
  matches = varPattern.match(a);
  if(matches) return matches.n.s;
  if(a instanceof ast.StringNode) return a.s;
  return "FAIL";
}

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
    return ast.cons("UnusedArguments", [this[0], unusedVars]);
  })
  .filter(function() {
    return this[1].isEmpty() ? ast.fail() : this;
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
    return ast.cons("UndeclaredVariables", [matches.nm, undeclared]);
  })
  .filter(function() {
    return this[1].isEmpty() ? ast.fail() : this;
  });
}

function createOutline(a) {
  return a.collect(function() {
    var bindings = {};
    var matches = functionPattern.match(this, bindings) || assFunPattern.match(this, bindings) || varFunPattern.match(this, bindings);
    if(matches) return ast.cons("Function", [ast.string(ppJs(bindings.nm)), createOutline(bindings.body)]);
    matches = varDeclPattern.match(this, bindings);
    if(matches) return ast.cons("Variable", [bindings.n]);
    return ast.fail();
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
      $("#outline").val(createOutline(a).toPrettyString());
      $("#ast").val(a.toPrettyString());
      localStorage.code = code;
    });
  $("#code").keyup();
});
});

