define(function(require, exports, module) {

var tree = require('treehugger/tree'),
    types = require('treehugger/js/types');

require('treehugger/traverse');

var STRING_TYPE = 'string';
var NUMBER_TYPE = 'number';

function FunctionType(returnTypes) {
  this.returnTypes = returnTypes;
}

function coerceTypes(t1, t2) {
  if(t1.length !== 1 || t2.length !== 1) {
    return t1.concat(t2);
  }
  t1 = t1[0];
  t2 = t2[0];
  if(t1 === t2) {
    return [t1];
  } else if(t1 === STRING_TYPE || t2 === STRING_TYPE) {
    return [STRING_TYPE];
  }
  return [t1, t2];
}

function Scope(parent) {
  this.parent = parent;
  this.vars = {};
}

Scope.prototype.declare = function(name) {
  this.vars[name] = {types: [], exps: []};
};

Scope.prototype.get = function(name) {
  if(this.vars[name]) {
    return this.vars[name];
  } else if(this.parent) {
    return this.parent.get(name);
  }
};

Scope.prototype.getType = function(name) {
  if(this.types[name]) {
    return this.types[name];
  } else if(this.parent) {
    return this.parent.getType(name);
  }
};

Scope.prototype.inferType = function(e) {
  var scope = this;
  var types = [];
  e.rewrite("String(_)", function() { types.push(STRING_TYPE); return this; },
            "Number(_)", function() { types.push(NUMBER_TYPE); return this; },
            "Var(nm)", function(b) {
              var analysis = scope.get(b.nm.value);
              if(!analysis) {
                return false;
              }
              if(analysis.types.length > 0) {
                types = types.concat(analysis.types);
              } else {
                analysis.exps.forEach(function(e) {
                  types = types.concat(scope.inferType(e));
                });
                analysis.types = types;
              }
              return this;
            },
            "New(Var(name), args)", function(b) {
              types.push(b.name.value);
              return this;
            },
            "Op(op, e1, e2)", function(b) {
              types = types.concat(coerceTypes(scope.inferType(b.e1), scope.inferType(b.e2)));
              return this;
            },
            "Call(e, _)", function(b) {
              var ts = scope.inferType(b.e);
              for(var i = 0; i < ts.length; i++) {
                if(ts[i] instanceof FunctionType) {
                  types = types.concat(ts[i].returnTypes);
                }
              }
              return this;
            },
            "PropAccess(e, prop)", function(b) {
              var ts = scope.inferType(b.e);
              for(var i = 0; i < ts.length; i++) {
                var type = scope.getType(ts[i]);
                if(type) {
                  var method = type.methods[b.prop.value];
                  var funScope = method.meta.scope;
                  types = types.concat(new FunctionType(funScope.inferTypeVar('__return')));
                }
              }
              return this;
            },
            "Function(_, _, _)", function() {
              var scope = this.meta.scope;
              types.push(new FunctionType(scope.inferTypeVar('__return')));
            });
  return types;
};

Scope.prototype.inferTypeVar = function(name) {
  return this.inferType(tree.cons("Var", [tree.string(name)]));
};

Scope.prototype.hint = function(name, e) {
  var analysis = this.get(name);
  if(analysis) {
    analysis.exps.push(e);
  }
};

Scope.prototype.toJSON = function() {
  return {types: this.types, functions: this.functions};
};

function inferAllTypes(scope, node) {
  node.traverseTopDown(types.typeAnalysisPrototype(scope).concat(types.functionAnalysis(scope)));
  node.traverseTopDown(
    "Function(name, fargs, body)", function(b) {
        scope.declare(b.name.value);
        scope.hint(b.name.value, this);
        var localScope = new Scope(scope);
        this.meta.scope = localScope;
        b.fargs.forEach(function(farg) {
          localScope.declare(farg.value);
        });
        localScope.declare('__return');
        inferAllTypes(localScope, b.body);
        return this; // avoid deeper traversal
      },
    "VarDecls(vardecs)", function(b) {
        b.vardecs.each(
          "VarDeclInit(name, e)", function(b) {
              scope.declare(b.name.value);
              scope.hint(b.name.value, b.e);
            }, 
          "VarDecl(name)", function(b) {
              scope.declare(b.name.value);
            }
        );
      },
    "ExpStat(Assign(Var(name), e))", function(b) {
        scope.hint(b.name.value, b.e);
      },
    "Return(e)", function(b) {
        scope.hint('__return', b.e);
      },
    "Var(nm)", function(b) {
        this.meta.scope = scope;
      }
  );
  return scope;
}

exports.inferAllTypes = inferAllTypes;
exports.Scope = Scope;
exports.FunctionType = FunctionType;

});