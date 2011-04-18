define(function(require, exports, module) {

require('treehugger/traverse');

var STRING_TYPE = 'string';
var NUMBER_TYPE = 'number';

function VarTracker() {
  this.vars = {};
}

VarTracker.prototype.track = function(name) {
  if(!this.vars[name]) {
    this.vars[name] = {types: {}, dependsOn: {}};
  }
};

VarTracker.prototype.getTypes = function(name) {
  var analysis = this.vars[name];
  
  var typesAr = [];
  for(var t in analysis.types) {
    if(analysis.types.hasOwnProperty(t)) {
      typesAr.push(t);
    }
  }
  return typesAr;
};

VarTracker.prototype.analyzeExp = function(e) {
  function mergeAnalyses(t1, t2) {
    var analysis = {type: null, dependsOn: {}};
    if(t1.type === STRING_TYPE || t2.type === STRING_TYPE) {
      analysis.type = STRING_TYPE;
    } else {
      analysis.type = t1.type;
    }
    for(var p in t1) {
      if(t2.hasOwnProperty(p)) {
        analysis[p] = true;
      }
    }
    for(p in t2) {
      if(t2.hasOwnProperty(p)) {
        analysis[p] = true;
      }
    }
    return analysis;
  }
  var analysis = {type: null, dependsOn: {}};
  var tracker = this;
  e.rewrite("String(_)", function() { analysis.type = STRING_TYPE; },
            "Number(_)", function() { analysis.type = NUMBER_TYPE; },
            "Var(nm)", function(b) {
              analysis.dependsOn[b.nm.value] = true;
              tracker.track(b.nm.value);
            },
            "Op(op, e1, e2)", function(b) {
              analysis = mergeTypes(tracker.deriveType(b.e1), tracker.deriveType(b.e2));
            });
  return analysis;
};

VarTracker.prototype.hint = function(name, e) {
  if(!this.vars[name]) return; // Don't care
  var analysis = this.analyzeExp(e);
  var rec = this.vars[name];
  if(analysis.type) {
    rec.types[analysis.type] = true;
  }
  for(var p in analysis.dependsOn) {
    if(analysis.dependsOn.hasOwnProperty(p)) {
      rec.dependsOn[p] = true;
    }
  }
};

function inferType(node) {
  var tracker = new VarTracker();
  var name;
  node.rewrite("Var(nm)", function(b) {
    name = b.nm.value;
    tracker.track(name);
    this.traverseUp("VarDecls(vardecs)", function(b) {
            b.vardecs.filter("VarDeclInit(name, e)", function(b) {
              tracker.hint(b.name.value, b.e);
            });
          });
  });
  console.log(tracker, name, tracker.getTypes(name));
  return tracker.getTypes(name);
}

exports.inferType = inferType;

});