require({baseUrl: "lib"}, ["ast", "traversal", "js/parse", "jquery"], function(ast, traversal, parsejs) {

var functionPattern = ast.parse("Function(<nm>, <args>, <body>)"),
    varDeclPattern  = ast.parse("VarDecl(<n>, <e>)"),
    varPattern      = ast.parse("Var(<n>)"),
    assFunPattern   = ast.parse("Assign(<nm>, Function(<ignore>, <args>, <body>))"),
    varFunPattern   = ast.parse("VarDecl(<nm>, Function(<ignore>, <args>, <body>))"),
    propPattern     = ast.parse("PropAccess(<obj>, <f>)");

// Pretty prints  property access variant AST to JS
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
    if(!matches) return this.fail();
    var unusedVars = matches.args.filter(function() {
      var arg = this;
      var uses = matches.body.collect(function() {
        //console.log(arg.toString(), this.toString(), varPattern.match(this, {n: arg}));
        return varPattern.match(this, {n: arg}) ? this : this.fail();
      });
      console.log(uses.toString(), uses.isEmpty());
      return uses.isEmpty(); 
    });
    return ast.cons("UnusedArguments", [this[0], unusedVars]);
  })
  .filter(function() {
    return !this[1].isEmpty();
  });
}

function undeclaredVars(a) {
  return a.collect(function() {
    var matches = functionPattern.match(this);
    if(!matches) return ast.fail();
    var localVariables = matches.body.collect(function() {
      if(functionPattern.match(this)) return this;
      var matches = varDeclPattern.match(this);
      return matches ? matches.n : this.fail();
    }).concat(matches.args);
    var undeclared = matches.body.collect(function() {
      var matches = varPattern.match(this);
      if(!matches) return this.fail();
      return localVariables.contains(matches.n) ? this.fail() : this;
    });
    return ast.cons("UndeclaredVariables", [matches.nm, undeclared]);
  })
  .filter(function() {
    return !this[1].isEmpty();
  });
}

function createOutline(a) {
  return a.collect(function() {
    return this.leftChoice(function() {
      var bindings = {};
      var matches = functionPattern.match(this, bindings) ||
                    assFunPattern.match(this, bindings) ||
                    varFunPattern.match(this, bindings);
      return matches ? ast.cons("Function", [ast.string(ppJs(bindings.nm)), createOutline(bindings.body)]) : this.fail();
    }, function() {
      var matches = varDeclPattern.match(this);
      return matches ? ast.cons("Variable", [matches.n]) : this.fail();
    });
  });
}

require.ready(function() {
  if(localStorage.code) {
    $("#code").val(localStorage.code);
  }
  $("#code").keyup(function() {
      var code = $("#code").val();
      var a = parsejs.parse(code);
      $("#ast").val(a.toPrettyString());
      $("#analysis").val(unusedArguments(a).concat(undeclaredVars(a)).toPrettyString());
      $("#outline").val(createOutline(a).toPrettyString());
      localStorage.code = code;
    });
  $("#code").keyup();
});
});

