define(function(require, exports, module) {
  
var Value         = require('treehugger/js/values').Value,
    FunctionValue = require('treehugger/js/values').FunctionValue,
    instantiate   = require('treehugger/js/values').instantiate;

exports.Object = createBuiltinType();
exports.String = createBuiltinType();
exports.Number = createBuiltinType();
exports.Boolean = createBuiltinType();
exports.Function = createBuiltinType();
exports.Array = createBuiltinType();

addTypeInstanceProperty(exports.Object, 'toString', instantiate(exports.Function, new FunctionValue(null, exports.String)));
addTypeInstanceProperty(exports.Object, 'hasOwnProperty', instantiate(exports.Function, new FunctionValue(null, exports.Boolean)));
addTypeInstanceProperty(exports.Object, 'isPrototypeOf', instantiate(exports.Function, new FunctionValue(null, exports.Boolean)));

addTypeProperty(exports.Object, 'create', new FunctionValue());

addTypeInstanceProperty(exports.String, '<<String>>', new Value());
addTypeInstanceProperty(exports.String, 'length', new Value());
addTypeInstanceProperty(exports.String, '__proto__', exports.Object);

addTypeInstanceProperty(exports.Number, '<<Number>>', new Value());
addTypeInstanceProperty(exports.Number,'__proto__', exports.Object);
addTypeInstanceProperty(exports.Number,'toExponential', instantiate(exports.Function, new FunctionValue(null, exports.String)));
addTypeInstanceProperty(exports.Number,'toFixed', instantiate(exports.Function, new FunctionValue(null, exports.String)));
addTypeInstanceProperty(exports.Number,'toLocaleString', instantiate(exports.Function, new FunctionValue(null, exports.String)));


addTypeInstanceProperty(exports.Boolean, '<<Boolean>>', new Value());
addTypeInstanceProperty(exports.Boolean, '__proto__', exports.Object);

addTypeInstanceProperty(exports.Function, '<<Function>>', new Value());
addTypeInstanceProperty(exports.Function, 'call', instantiate(exports.Function, new FunctionValue()));
addTypeInstanceProperty(exports.Function, 'apply', instantiate(exports.Function, new FunctionValue()));
addTypeInstanceProperty(exports.Function, 'toSource', instantiate(exports.Function, new FunctionValue(null, exports.String)));
addTypeInstanceProperty(exports.Function, '__proto__', exports.Object);

addTypeInstanceProperty(exports.Array, '<<Array>>', new Value());
addTypeInstanceProperty(exports.Array,'push', instantiate(exports.Function, new FunctionValue()));
addTypeInstanceProperty(exports.Array,'concat', instantiate(exports.Function, new FunctionValue(null, exports.Array)));
addTypeInstanceProperty(exports.Array,'slice', instantiate(exports.Function, new FunctionValue(null, exports.Array)));
addTypeInstanceProperty(exports.Array,'splice', instantiate(exports.Function, new FunctionValue()));

function createBuiltinType() {
  var val = new Value();
  val.fieldHint('prototype', new Value());
  return val;
}

function addTypeProperty(typ, prop, value) {
  typ.fieldHint(prop, value);
}

function addTypeInstanceProperty(typ, prop, value) {
  typ.get('prototype').forEach(function(v) {
    v.fieldHint(prop, value);
  });
}

});