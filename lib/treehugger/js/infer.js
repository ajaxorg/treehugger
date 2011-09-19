/**
 * Module that implements basic value inference. Type inference in Javascript
 * doesn't make a whole lot of sense because it is so dynamic. Therefore, this
 * analysis semi-evaluates the Javascript AST and attempts to do simple predictions
 * of the values an expression, function or variable may contain.
 */

define(function(require, exports, module) {

var tree          = require('treehugger/tree'),
    builtins      = require('treehugger/js/builtins'),
    Value         = require('treehugger/js/values').Value,
    FunctionValue = require('treehugger/js/values').FunctionValue,
    instantiate   = require('treehugger/js/values').instantiate;

require('treehugger/traverse');

/**
 * Implements Javascript's scoping mechanism using a hashmap with parent
 * pointers.
 */
function Scope(parent) {
  this.parent = parent;
  this.vars = {};
}

/**
 * Declare a variable in the current scope
 */
Scope.prototype.declare = function(name, initValue) {
  if(!this.vars['_'+name]) {
    this.vars['_'+name] = initValue ? [initValue] : [];
  }
};

/**
 * Get possible values of a variable
 * @param name name of variable
 * @return array of values
 */
Scope.prototype.get = function(name) {
  if(this.vars['_'+name]) {
    return this.vars['_'+name];
  } else if(this.parent) {
    return this.parent.get(name); 
  }
};

/**
 * Hints at what the value of a variable may be 
 * @param variable name
 * @param val AST node of expression
 */
Scope.prototype.hint = function(name, val) {
  var analysis = this.get(name);
  if(analysis) {
    analysis.push(val);
  }
};

/**
 * Attempts to infer the value, of possible values of expression `e`
 * @param e AST node repersenting an expression
 * @return an array of possible values
 */
Scope.prototype.inferValues = function(e) {
  var scope = this;
  var values = [];
  e.rewrite(
    "String(_)", function() {
        values = [instantiate(builtins.String)];
        return this;
      },
    "Number(_)", function() {
        values = [instantiate(builtins.Number)];
        return this;
      },
    "True()", function() {
        values = [instantiate(builtins.Boolean)];
        return this;
      },
    "False()", function() {
        values = [instantiate(builtins.Boolean)];
        return this;
      },
    "ArrayInit(_)", function() {
        values = [instantiate(builtins.Array)];
        return this;
      },
    "Var(nm)", function(b) {
        var v = this.meta.scope ? this.meta.scope.get(b.nm.value) : scope.get(b.nm.value);
        if(!v) {
          return false;
        }
        values = v.slice(0);
        return this;
      },
    "ObjectInit(inits)", function(b) {
        var v = instantiate(builtins.Object);
        b.inits.filter('PropertyInit(prop, e)', function(b) {
          scope.inferValues(b.e).forEach(function(val) {
            v.fieldHint(b.prop.value, val);
          });
        });
        values = [v];
      },
    "New(e, args)", function(b) {
        var vs = scope.inferValues(b.e);
        vs.forEach(function(fn) {
          var value = instantiate(fn);
          var fargs = fn.getFargs();
          var funScope = handleFunction(fn, scope, value);
          for(var i = 0; i < b.args.length; i++) {
            scope.inferValues(b.args[i]).forEach(function(v) {
              funScope.hint(fargs[i].value, v);
            });
          }
          inferAllTypes(funScope, fn.getBody());
          values.push(value);
        });
        return this;
      },
    /*"Op(op, e1, e2)", function(b) {
        values = values.concat(coercevalues(scope.inferValues(b.e1), scope.inferValues(b.e2)));
        return this;
      },*/
    "This()", function() {
        values = this.meta.scope ? this.meta.scope.get('__this') : scope.get('__this');
        return this;
      },
    "Call(PropAccess(e, method), args)", function(b) {
        //var propValues = scope.inferValues(this[0]);
        var objectValues = scope.inferValues(b.e);
        //console.log("Call: ", this.toString(), this[0], objectValues);
        objectValues.forEach(function(objectValue) {
          var methods = objectValue.get(b.method.value);
          if(methods.length > 0) {
            methods.forEach(function(fn) {
              if(fn instanceof FunctionValue) {
                var funScope = handleFunction(fn, scope, new Value()); //objectValue);
                var fargs = fn.getFargs();
                for(var i = 0; i < b.args.length, i < fargs.length; i++) {
                  scope.inferValues(b.args[i]).forEach(function(v) {
                    // TODO: create a link rather than a copy
                    funScope.hint(fargs[i].value, v);
                  });
                }
                inferAllTypes(funScope, fn.getBody());
                values = values.concat(funScope.get('__return'));
              }
            });
          }
        });
        return this;
      },
    "Call(e, args)", function(b) {
        var vs = scope.inferValues(b.e);
        vs.forEach(function(fn) {
          if(fn instanceof FunctionValue) {
            var funScope = handleFunction(fn, scope, new Value());
            var fargs = fn.getFargs();
            for(var i = 0; i < b.args.length, i < fargs.length; i++) {
              scope.inferValues(b.args[i]).forEach(function(v) {
                funScope.hint(fargs[i].value, v);
              });
            }
            inferAllTypes(funScope, fn.getBody());
            values = values.concat(funScope.get('__return'));
          }
        });
        return this;
      },
    "PropAccess(e, prop)", function(b) {
        var vs = scope.inferValues(b.e);
        vs.forEach(function(val) {
          var vs = val.get(b.prop.value);
          values = values.concat(vs);
        });
        return this;
      },
    "Function(name, fargs, _)", function(b) {
        var val = new FunctionValue(this);
        builtins.Function.get('prototype').forEach(function(v) {
          val.fieldHint('__proto__', v);
        });
        values = [val];
        return this;
      }
  );
  return values;
};

/**
 * Functions get two implicit variables: a __this variable and
 * a __return variable.
 */
function handleFunction(fn, scope, thisVal) {
  var localScope = fn.node && fn.node.meta.scope ? fn.node.meta.scope : new Scope(scope);
  localScope.declare('__return');
  if(fn.node) {
    fn.node.meta.scope = localScope;
    fn.node.rewrite('Function(name, fargs, body)', function(b) {
      b.fargs.forEach(function(farg) {
        localScope.declare(farg.value);
        localScope.hint(farg.value, new Value());
      });
      localScope.declare('__this');
      localScope.hint('__this', thisVal);
      inferAllTypes(localScope, b.body);
      return this;
    });
  } else if(fn.returnValue) {
    localScope.hint('__return', fn.returnValue);
  }
  return localScope;
}

/**
 * Returns an array of transformations that pin-point points in the 
 * Javascript program where values are assigned to variables and stores
 * them in the current scope. Var() nodes are attached their current scope
 * for later inference.
 */
function evalRules(scope) {
  return [// "_", function() { console.log(this.toString()); },
    "Function(name, fargs, body)", function(b) {
        var val = new FunctionValue(this);
        builtins.Function.get('prototype').forEach(function(v) {
          val.fieldHint('__proto__', v);
        });
        val.fieldHint('prototype', new Value());
        if(b.name.value) {
          scope.declare(b.name.value, val);
        }
        handleFunction(val, scope, new Value());
        return this;
      },
    "VarDecls(vardecs)", function(b) {
        b.vardecs.each(
          "VarDeclInit(name, e)", function(b) {
              scope.declare(b.name.value);
              inferAllTypes(scope, b.e);
              var values = scope.inferValues(b.e);
              values.forEach(function(v) {
                scope.hint(b.name.value, v);
              });
            }, 
          "VarDecl(name)", function(b) {
              scope.declare(b.name.value);
            }
        );
        return this;
      },
    "ExpStat(Assign(PropAccess(e1, prop), e2))", function(b) {
        inferAllTypes(scope, b.e1);
        var vs = scope.inferValues(b.e1);
        inferAllTypes(scope,b.e2);
        var vs2 = scope.inferValues(b.e2);
        vs.forEach(function(v) {
          vs2.forEach(function(v2) {
            v.fieldHint(b.prop.value, v2);
          });  
        });
        return this;
      },
    "ExpStat(Assign(Var(name), e))", function(b) {
        inferAllTypes(scope,b.e);
        var vs = scope.inferValues(b.e);
        vs.forEach(function(v) {
          scope.hint(b.name.value, v);
        });
        return this;
      },
    "PropAccess(e, prop)", function(b) {
        inferAllTypes(scope, b.e);
        var vs = scope.inferValues(this);
        if(vs.length > 0) {
          return; // property is defined
        }
        // Apparently there's a property used in the code that
        // is defined elsewhere (or by some other means)
        // let's add it to the object
        vs = scope.inferValues(b.e);
        vs.forEach(function(v) {
          v.fieldHint(b.prop.value, new Value());
        });
        return this;
      },
    "Call(PropAccess(e, prop), args)", function(b) {
        // property access is called as a function, let's hint that
        inferAllTypes(scope, b.e);
        inferAllTypes(scope, b.args);
        var vs = scope.inferValues(b.e);
        vs.forEach(function(v) {
          v.fieldHint(b.prop.value, instantiate(builtins.Function));
        });
        return this;
      },
    "Return(e)", function(b) {
        inferAllTypes(scope, b.e);
        var vs = scope.inferValues(b.e);
        vs.forEach(function(v) {
          scope.hint('__return', v);
        });
        return this;
      },
    "Var(name)", function(b) {
        this.meta.scope = scope;
        var vs = scope.get(b.name.value);
        if(!vs) {
          scope.declare(b.name.value);
          scope.hint(b.name.value, new Value());
        }
        return this;
      },
    "This()", function() {
        this.meta.scope = scope;
        // NOTE: Probably something went wrong here, or using this pointer outside of function?
        var vs = scope.get('__this');
        if(!vs) {
          scope.declare('__this');
          scope.hint('__this', new Value());
        }
        return this;
      }
  ];
}

function getAllProperties(scope, node) {
  var properties = {};
  function handleProto(v) {
    for(var p in v.fields) {
      if(v.fields.hasOwnProperty(p)) {
        properties[p] = true;
      }
    }
    v.get('__proto__').forEach(function(v) {
      handleProto(v);
    });
  }
  scope.inferValues(node).forEach(function(v) {
    for(var p in v.fields) {
      if(v.fields.hasOwnProperty(p)) {
        properties[p] = true;
      }
    }
    v.get('__proto__').forEach(function(v) {
      handleProto(v);
    });
  });
  var ar = [];
  for(var p in properties) {
    if(properties.hasOwnProperty(p)) {
      ar.push(p.substring(1));
    }
  }
  return ar;
}

/**
 * Invoke the actual traversal applying the eval rules
 */
function inferAllTypes(scope, node) {
  node.traverseTopDown(evalRules(scope));
  return scope;
}

function createRootScope() {
  var scope = new Scope();
  scope.declare('Object');
  scope.hint('Object', builtins.Object);
  scope.declare('String');
  scope.hint('Object', builtins.Object);
  scope.declare('Number');
  scope.hint('Object', builtins.Object);
  return scope;
}

exports.inferAllTypes = inferAllTypes;
exports.getAllProperties = getAllProperties;
exports.Scope = Scope;
exports.createRootScope = createRootScope;

});