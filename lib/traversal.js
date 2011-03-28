define(function(require, exports, module) {

var ast = require('ast'),
    Node = ast.Node;

if (!Function.prototype.curry) {
  Function.prototype.curry = function () {
    var fn = this, args = Array.prototype.slice.call(arguments);
    return function () {
      return fn.apply(this, args.concat(Array.prototype.slice.call(arguments)));
    };
  };
}

exports.all = function(fn) {
  var newChildren, result, i;

  if(this.hasFailed()) return this;

  if(this instanceof ast.ConsNode) {
    newChildren = [];
    for (i = 0; i < this.length; i++) {
      result = fn.call(this[i]);
      if (!result.hasFailed()) {
        newChildren.push(result);
      } else {
        return this.fail();
      }
    }
    return ast.cons(this.cons, newChildren);
  } else if(this instanceof ast.ListNode) {
    newChildren = [];
    for (i = 0; i < this.length; i++) {
      result = fn.call(this[i]);
      if (!result.hasFailed()) {
        newChildren.push(result);
      } else {
        return this.fail();
      }
    }
    return ast.list(newChildren);
  } else {
    return this;
  }
};

exports.one = function(fn) {
  var newChildren, result, i, oneSucceeded;

  if(this.hasFailed()) return this;
  if(this instanceof ast.ConsNode) {
    newChildren = [];
    oneSucceeded = false;
    for (i = 0; i < this.length; i++) {
      result = fn.call(this[i]);
      if (!result.hasFailed()) {
        newChildren.push(result);
        oneSucceeded = true;
      } else {
        newChildren.push(this[i]);
      }
    }
    if (oneSucceeded) {
      return ast.cons(this.cons, newChildren);
    } else {
      return this.fail();
    }
  } else if(this instanceof ast.ListNode) {
    newChildren = [];
    oneSucceeded = false;
    for (i = 0; i < this.length; i++) {
      result = fn.call(this[i]);
      if (!result.hasFailed()) {
        newChildren.push(result);
        oneSucceeded = true;
      } else {
        newChildren.push(this[i]);
      }
    }
    if (oneSucceeded) {
      return ast.list(this.cons, newChildren);
    } else {
      return this.fail();
    }
  } else {
    return this;
  }
};

/**
 * Sequential application last argument is term
 */
exports.seq = function() {
  if(this.hasFailed()) return this;
  var fn;
  var t = this;
  for ( var i = 0; i < arguments.length; i++) {
    fn = arguments[i];
    t = fn.call(t);
    if (t.hasFailed()) {
      return this.fail();
    }
  }
  return this;
};

/**
 * Left-choice (<+) application last argument is term
 */
exports.leftChoice = function() {
  if(this.hasFailed()) return this;
  var t = this;
  var fn, result;
  for ( var i = 0; i < arguments.length; i++) {
    fn = arguments[i];
    result = fn.call(t);
    if (!result.hasFailed()) {
      return result;
    }
  }
  return this.fail();
};

// Try
exports.attempt = function(fn) {
  if(this.hasFailed()) return this;
  var result = fn.call(this);
  return result.hasFailed() ? this : result;
};

exports.debug = function(pretty) {
  if(this.hasFailed()) return this;
  console.log(pretty ? this.toPrettyString("") : this.toString());
  return this;
};

exports.map = function(fn) {
  return this.all(fn);
};

exports.filter = function(fn) {
  var matching = [];
  this.forEach(function(el) {
    var r = fn.call(el);
    if(!r.hasFailed()) {
      matching.push(r);
    }
  });
  return ast.list(matching);
};

exports.alltd = function(fn) {
  if(this.hasFailed()) return this;
  return this.leftChoice(fn, exports.all.curry(this.alltd.curry(fn)));
};

exports.topdown = function(fn) {
  if(this.hasFailed()) return this;
  return this.seq(fn, exports.all.curry(exports.topdown.curry(fn)));
};

exports.bottomup = function(fn) {
  if(this.hasFailed()) return this;
  return this.seq(exports.all.curry(exports.bottomup.curry(fn)), fn);
};

exports.innermost = function(fn) {
  if(this.hasFailed()) return this;
  return this.bottomup(exports.attempt.curry(exports.seq.curry(fn, exports.innermost.curry(fn))));
};

exports.matches = function(pat, matches) {
  if(this.hasFailed()) return this;
  return pat.match(this, matches) ? this : this.fail();
};

exports.collect = function(fn) {
  if(this.hasFailed()) return this;
  var results = [];
  this.alltd(function() {
      var r = fn.call(this);
      if(!r.hasFailed()) {
        results.push(r);
      }
      return r;
    });
  return ast.list(results);
};

exports.fail = function() {
  return ast.fail(this);
};

for(var p in exports) {
    if(exports.hasOwnProperty(p)) {
        Node.prototype[p] = exports[p];
    }
}

});
