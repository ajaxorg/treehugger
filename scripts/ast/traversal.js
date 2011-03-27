
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
      switch (this.type) {
      case ast.AST_CONS:
        var newChildren = [];
        var result;
        for ( var i = 0; i < this.children.length; i++) {
          result = fn.call(this.children[i]);
          if (result !== null) {
            newChildren.push(result);
          } else {
            return null;
          }
        }
        return new ast.ConsNode(this.cons, newChildren);
      case ast.AST_LIST:
        var newChildren = [];
        var result;
        for ( var i = 0; i < this.children.length; i++) {
          result = fn.call(this.children[i]);
          if (result !== null) {
            newChildren.push(result);
          } else {
            return null;
          }
        }
        return new ast.ListNode(newChildren);
        break;
      case ast.AST_INT:
      case ast.AST_STRING:
      case ast.AST_PLACEHOLDER:
        return this;
      default:
        console.log("FAIL: ", t);
        return null;
        break;
      }
    }

    traversal.one = function(fn) {
      switch (this.type) {
      case ast.AST_CONS:
        var newChildren = [];
        var result;
        var oneSucceeded = false;
        for ( var i = 0; i < this.children.length; i++) {
          result = fn.call(this.children[i]);
          if (result !== null) {
            newChildren.push(result);
            oneSucceeded = true;
          } else {
            newChildren.push(this.children[i]);
          }
        }
        if (oneSucceeded) {
          return new ast.ConsNode(this.cons, newChildren);
        } else {
          return null;
        }
        break;
      case ast.AST_LIST:
        var newChildren = [];
        var result;
        var oneSucceeded = false;
        for ( var i = 0; i < this.children.length; i++) {
          result = fn.call(this.children[i]);
          if (result !== null) {
            newChildren.push(result);
            oneSucceeded = true;
          } else {
            newChildren.push(this.children[i]);
          }
        }
        if (oneSucceeded) {
          return new ast.ListNode(this.cons, newChildren);
        } else {
          return null;
        }
        break;
      case ast.AST_INT:
      case ast.AST_STRING:
      case ast.AST_PLACEHOLDER:
        return this;
      }
    }

    /**
     * Sequential application last argument is term
     */
    traversal.seq = function() {
      var fn;
      var t = this;
      for ( var i = 0; i < arguments.length; i++) {
        fn = arguments[i];
        t = fn.call(t);
        if (t === null) {
          return null;
        }
      }
      return t;
    }

    /**
     * Left-choice (<+) application last argument is term
     */
    traversal.leftChoice = function() {
      var t = this;
      var fn, result;
      for ( var i = 0; i < arguments.length; i++) {
        fn = arguments[i];
        result = fn.call(t);
        if (result !== null) {
          return result;
        }
      }
      return null;
    };

    // Try
    traversal.attempt = function(fn) {
      var result = fn.call(this);
      return result !== null ? result : this;
    };

    traversal.debug = function() {
      console.log(this.toString());
      return this;
    };

    traversal.alltd = function(fn) {
      return this.leftChoice(fn, traversal.all.curry(this.alltd.curry(fn)));
    };

    traversal.topdown = function(fn) {
      return this.seq(fn, traversal.all.curry(traversal.topdown.curry(fn)));
    };

    traversal.bottomup = function(fn) {
      return this.seq(traversal.all.curry(traversal.bottomup.curry(fn)), fn);
    };

    traversal.innermost = function(fn) {
      return this.bottomup(traversal.attempt.curry(traversal.seq.curry(fn, traversal.innermost.curry(fn))));
    };

    traversal.collect = function(fn) {
      var results = [];
      this.alltd(function() {
          var r = fn.call(this);
          if(r) {
            results.push(r);
            return this;
          } else {
            return null;
          }
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
