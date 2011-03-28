
define(["ast"], function(ast) {
    var traversal = {};
    var Node = ast.Node;

    if (!Function.prototype.curry) {
      Function.prototype.curry = function () {
        var fn = this, args = Array.prototype.slice.call(arguments);
        return function () {
          return fn.apply(this, args.concat(Array.prototype.slice.call(arguments)));
        };
      };
    }

    traversal.all = function(fn) {
      if(this.hasFailed()) return this;

      if(this instanceof ast.ConsNode) {
        var newChildren = [];
        var result;
        for ( var i = 0; i < this.length; i++) {
          result = fn.call(this[i]);
          if (!result.hasFailed()) {
            newChildren.push(result);
          } else {
            return ast.fail();
          }
        }
        return new ast.ConsNode(this.cons, newChildren);
      } else if(this instanceof ast.ListNode) {
        var newChildren = [];
        var result;
        for ( var i = 0; i < this.length; i++) {
          result = fn.call(this[i]);
          if (!result.hasFailed()) {
            newChildren.push(result);
          } else {
            return ast.fail();
          }
        }
        return new ast.ListNode(newChildren);
      } else {
        return this;
      }
    }

    traversal.one = function(fn) {
      if(this.hasFailed()) return this;
      if(this instanceof ast.ConsNode) {
        var newChildren = [];
        var result;
        var oneSucceeded = false;
        for ( var i = 0; i < this.length; i++) {
          result = fn.call(this[i]);
          if (!result.hasFailed()) {
            newChildren.push(result);
            oneSucceeded = true;
          } else {
            newChildren.push(this[i]);
          }
        }
        if (oneSucceeded) {
          return new ast.ConsNode(this.cons, newChildren);
        } else {
          return ast.fail();
        }
      } else if(this instanceof ast.ListNode) {
        var newChildren = [];
        var result;
        var oneSucceeded = false;
        for ( var i = 0; i < this.length; i++) {
          result = fn.call(this[i]);
          if (!result.hasFailed()) {
            newChildren.push(result);
            oneSucceeded = true;
          } else {
            newChildren.push(this[i]);
          }
        }
        if (oneSucceeded) {
          return new ast.ListNode(this.cons, newChildren);
        } else {
          return ast.fail();
        }
      } else {
        return this;
      }
    };

    /**
     * Sequential application last argument is term
     */
    traversal.seq = function() {
      if(this.hasFailed()) return this;
      var fn;
      var t = this;
      for ( var i = 0; i < arguments.length; i++) {
        fn = arguments[i];
        t = fn.call(t);
        if (t.hasFailed()) {
          return ast.fail();
        }
      }
      return this;
    };

    /**
     * Left-choice (<+) application last argument is term
     */
    traversal.leftChoice = function() {
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
      return ast.fail();
    };

    // Try
    traversal.attempt = function(fn) {
      if(this.hasFailed()) return this;
      var result = fn.call(this);
      return result.hasFailed() ? this : result;
    };

    traversal.debug = function(pretty) {
      if(this.hasFailed()) return this;
      console.log(pretty ? this.toPrettyString("") : this.toString());
      return this;
    };

    traversal.map = function(fn) {
      return this.all(fn);
    };

    traversal.filter = function(fn) {
      var matching = [];
      this.forEach(function(el) {
        var r = fn.call(el);
        if(!r.hasFailed()) {
          matching.push(r);
        }
      });
      return new ast.ListNode(matching);
    };

    traversal.alltd = function(fn) {
      if(this.hasFailed()) return this;
      return this.leftChoice(fn, traversal.all.curry(this.alltd.curry(fn)));
    };

    traversal.topdown = function(fn) {
      if(this.hasFailed()) return this;
      return this.seq(fn, traversal.all.curry(traversal.topdown.curry(fn)));
    };

    traversal.bottomup = function(fn) {
      if(this.hasFailed()) return this;
      return this.seq(traversal.all.curry(traversal.bottomup.curry(fn)), fn);
    };

    traversal.innermost = function(fn) {
      if(this.hasFailed()) return this;
      return this.bottomup(traversal.attempt.curry(traversal.seq.curry(fn, traversal.innermost.curry(fn))));
    };

    traversal.collect = function(fn) {
      if(this.hasFailed()) return this;
      var results = [];
      this.alltd(function() {
          var r = fn.call(this);
          if(!r.hasFailed()) {
            results.push(r);
          }
          return r;
        });
      return new ast.ListNode(results);
    };

    for(var p in traversal) {
        if(traversal.hasOwnProperty(p)) {
            Node.prototype[p] = traversal[p];
        }
    }

    return traversal;
  });
