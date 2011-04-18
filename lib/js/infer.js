define(function(require, exports, module) {

function Scope(parent) {
  this.parent = parent;
  this.variables = {};
}

Scope.prototype.lookup = function(v) {
  if(this.variables[v] === undefined && this.parent) {
    return this.parent.lookup(v);
  } else {
    return this.variables[v];
  }
};

Scope.prototype.define = function(v, def) {
  this.variables[v] = def;
};

function getType(n) {
}

});