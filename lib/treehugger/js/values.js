define(function(require, exports, module) {

var tree = require('treehugger/tree');

function Value() {
  this.init();
}

Value.prototype.init = function() {
  this.fields = {};
};

Value.prototype.get = function(name) {
  var rv;
  if(this.fields['_'+name]) {
    rv = this.fields['_'+name];
  } else {
    rv = [];
  }
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

function FunctionValue(node, returnValue) {
  this.init();
  this.node = node;
  this.returnValue = returnValue;
}

FunctionValue.prototype = new Value();

FunctionValue.prototype.getFargs = function() {
  return this.node ? this.node[1] : [];
};

FunctionValue.prototype.getBody = function() {
  return this.node ? this.node[2] : tree.cons('None', []);
};

function instantiate(fn, initVal) {
  var value = initVal || new Value();
  fn.get('prototype').forEach(function(p) {
    value.fieldHint('__proto__', p);
  });
  value.fieldHint('constructor', fn);
  return value;
}


exports.Value = Value;
exports.FunctionValue = FunctionValue;
exports.instantiate = instantiate;

});