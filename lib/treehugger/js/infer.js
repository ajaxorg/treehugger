/**
 * Module that implements basic value inference. Type inference in Javascript
 * doesn't make a whole lot of sense because it is so dynamic. Therefore, this
 * analysis semi-evaluates the Javascript AST and attempts to do simple predictions
 * of the values an expression, function or variable may contain.
 */

define(function(require, exports, module) {

var tree  = require('treehugger/tree');

require('treehugger/traverse');

function Value() {
  this.init();
}

Value.prototype.init = function() {
  this.fields = {};
};

Value.prototype.get = function(name) {
  if(this.fields['_'+name]) {
    return this.fields['_'+name];
  }
  var rv = [];
  if(name !== '__proto__') {
    this.get('__proto__').forEach(function(p) {
      rv = rv.concat(p.get(name));
    });
  }
  return rv;
};

Value.prototype.toJSON = function() {
  return this.fields;
};

Value.prototype.fieldHint = function(name, v) {
  if(!this.fields['_'+name]) {
    this.fields['_'+name] = [v];
  } else {
    this.fields['_'+name].push(v);
  }
};

function FunctionValue(node) {
  this.init();
  this.node = node;
}

FunctionValue.prototype = new Value();

/**
 * Dummy 'values' for strings and numbers
 */
var STRING_OBJ = new Value();
STRING_OBJ.fieldHint('isString', new FunctionValue(null));
var NUMBER_OBJ = new Value();
NUMBER_OBJ.fieldHint('isNum', new FunctionValue(null));
var FUNCTION_OBJ = new Value();
FUNCTION_OBJ.fieldHint('call', new FunctionValue(null));
FUNCTION_OBJ.fieldHint('apply', new FunctionValue(null));

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
Scope.prototype.declare = function(name) {
  this.vars['_'+name] = [];
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
    return this.parent.get(name) || [];
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
        values = [STRING_OBJ];
        return this;
      },
    "Number(_)", function() {
        values = [NUMBER_OBJ];
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
        var v = new Value();
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
          var value = new Value();
          fn.get('prototype').forEach(function(p) {
            value.fieldHint('__proto__', p);
          });
          vs.forEach(function(v) {
            value.fieldHint('constructor', fn);
          });
          var fargs = fn.node[1];
          handleFunction(fn.node, scope, value);
          var funScope = fn.node.meta.scope;
          for(var i = 0; i < b.args.length; i++) {
            scope.inferValues(b.args[i]).forEach(function(v) {
              funScope.hint(fargs[i].value, v);
            });
          }
          fn.node[2].traverseTopDown(evalRules(funScope));
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
        var vs = scope.inferValues(this[0]);
        var vs2 = scope.inferValues(b.e);
        vs2.forEach(function(v2) {
          if(v2.get(b.method.value).length > 0) {
            vs.forEach(function(fn) {
              console.log(v2);
              handleFunction(fn.node, scope, v2);
              var fargs = fn.node[1];
              var funScope = fn.node.meta.scope;
              for(var i = 0; i < b.args.length, i < fargs.length; i++) {
                scope.inferValues(b.args[i]).forEach(function(v) {
                  funScope.hint(fargs[i].value, v);
                });
              }
              fn.node[2].traverseTopDown(evalRules(funScope));
              values = values.concat(funScope.get('__return'));
            });
          }
        });
        return this;
      },
    "Call(e, args)", function(b) {
        var vs = scope.inferValues(b.e);
        vs.forEach(function(fn) {
          handleFunction(fn.node, scope);
          var fargs = fn.node[1];
          var funScope = fn.node.meta.scope;
          for(var i = 0; i < b.args.length, i < fargs.length; i++) {
            scope.inferValues(b.args[i]).forEach(function(v) {
              funScope.hint(fargs[i].value, v);
            });
          }
          fn.node[2].traverseTopDown(evalRules(funScope));
          values = values.concat(funScope.get('__return'));
        });
        return this;
      },
    "PropAccess(e, prop)", function(b) {
        var vs = scope.inferValues(b.e);
        vs.forEach(function(val) {
          var v = val.get(b.prop.value);
          if(v) {
            values = values.concat(v);
          }
        });
        return this;
      },
    "Function(name, fargs, _)", function(b) {
        var val = new FunctionValue(this);
        val.fieldHint('__proto__', FUNCTION_OBJ);
        values = [val];
      }
  );
  return values;
};

/**
 * Functions get two implicit variables: a __this variable and
 * a __return variable.
 */
function handleFunction(n, scope, thisVal) {
  n.rewrite('Function(name, fargs, body)', function(b) {
    var localScope = new Scope(scope);
    this.meta.scope = localScope;
    b.fargs.forEach(function(farg) {
      localScope.declare(farg.value);
    });
    localScope.declare('__return');
    if(thisVal) {
      localScope.declare('__this');
      localScope.hint('__this', thisVal);
    }
    inferAllTypes(localScope, b.body);
    return this;
  });
}

/**
 * Returns an array of transformations that pin-point points in the 
 * Javascript program where values are assigned to variables and stores
 * them in the current scope. Var() nodes are attached their current scope
 * for later inference.
 */
function evalRules(scope) {
  return [
    "Function(name, fargs, body)", function(b) {
        var val = new FunctionValue(this);
        val.fieldHint('__proto__', FUNCTION_OBJ);
        val.fieldHint('prototype', new Value());
        if(b.name.value) {
          scope.declare(b.name.value);
          scope.hint(b.name.value, val);
        }
        handleFunction(this, scope);
        return this;
      },
    "VarDecls(vardecs)", function(b) {
        b.vardecs.each(
          "VarDeclInit(name, e)", function(b) {
              scope.declare(b.name.value);
              var values = scope.inferValues(b.e);
              values.forEach(function(v) {
                scope.hint(b.name.value, v);
              });
            }, 
          "VarDecl(name)", function(b) {
              scope.declare(b.name.value);
            }
        );
      },
    "ExpStat(Assign(PropAccess(e1, prop), e2))", function(b) {
        var vs = scope.inferValues(b.e1);
        var vs2 = scope.inferValues(b.e2);
        vs.forEach(function(v) {
          vs2.forEach(function(v2) {
            v.fieldHint(b.prop.value, v2);
          });  
        });
      },
    "ExpStat(Assign(Var(name), e))", function(b) {
        var vs = scope.inferValues(b.e);
        vs.forEach(function(v) {
          scope.hint(b.name.value, v);
        });
      },
    "Return(e)", function(b) {
        var vs = scope.inferValues(b.e);
        vs.forEach(function(v) {
          scope.hint('__return', v);
        });
      },
    "Var(_)", function() {
        this.meta.scope = scope;
      },
    "This()", function() {
        this.meta.scope = scope;
      }
  ];
}

/**
 * Invoke the actual traversal applying the eval rules
 */
function inferAllTypes(scope, node) {
  node.traverseTopDown(evalRules(scope));
  return scope;
}

exports.inferAllTypes = inferAllTypes;
exports.Scope = Scope;

});