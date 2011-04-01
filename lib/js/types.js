define(function(require, exports, module) {

var ast = require('ast');

function startsWithCapital(value) {
  if(value.length === 0) {
    return false;
  }
  return value[0].toUpperCase() === value[0];
}

function lhsToString(n) {
  return n.apply("Var(<nm>)", function(b) { return b.nm.value; },
                 "PropAccess(<e>, <p>)", function(b) { return lhsToString(b.e) + "." + b.p.value; });
}

function lhsName(n) {
  return n.apply("Var(<nm>)", function(b) { return b.nm.value; },
                 "PropAccess(<e>, <p>)", function(b) { return b.p.value; });
}

exports.declare = function() {
  var types = {};
  this.collect("Function(<nm>, <fargs>, <body>)", function(bindings) {
    if(startsWithCapital(bindings.nm.value)) {
      types[bindings.nm.value] = {
        name: bindings.nm.value, 
        constructorArgs: bindings.fargs,
        methods: {},
        staticMethods: {},
        properties: {},
        node: this
      };
      return this;
    }
    return false;
  }, "Assign(<lhs>, Function(<nm>, <fargs>, <body>))", function(bindings) {
    var nm = lhsName(bindings.lhs);
    var qid = lhsToString(bindings.lhs);
    if(startsWithCapital(nm)) {
      types[qid] = {
        name: nm, 
        constructorArgs: bindings.fargs.toArray(),
        methods: {},
        staticMethods: {},
        properties: {},
        node: this
      };
      return this;
    }
    return false;
  }, 'Assign(PropAccess(PropAccess(<t>, "prototype"), <method>), Function(<nm>, <fargs>, <body>))', function(bindings) {
    var qid = lhsToString(bindings.t);
    var t = types[qid];
    if(!t) return false;
    t.methods[bindings.method.value] = {
      name: bindings.method.value,
      args: bindings.fargs.toArray(),
      node: this
    };
    return this;
  }, 'Assign(PropAccess(<t>, <method>), Function(<nm>, <fargs>, <body>))', function(bindings) {
    var name = lhsName(bindings.t);
    var qid = lhsToString(bindings.t);
    if(startsWithCapital(name)) {
      var t = types[qid];
      if(!t) return false;
      t.staticMethods[bindings.method.value] = {
        name: bindings.method.value,
        args: bindings.fargs.toArray(),
        node: this
      };
      return this;
    }
    return false;
  });
  console.log("Types: ", types);
};

});