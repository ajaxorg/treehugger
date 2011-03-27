
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

    Node.prototype.all = function(fn) {
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
        break;
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

    Node.prototype.one = function(fn) {
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
    Node.prototype.seq = function() {
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
    Node.prototype.leftChoice = function() {
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
    }

    // Try
    Node.prototype.attempt = function(fn) {
      var result = fn.call(this);
      return result !== null ? result : this;
    }

    Node.prototype.debug = function() {
      console.log(this.toString());
      return this;
    }

    Node.prototype.alltd = function(fn) {
      console.log("Here!");
      return this.leftChoice(fn, this.all.curry(this.alltd.curry(fn)));
    }

    function topdown (fn, t) {
      return seq(fn, all.curry(topdown.curry(fn)), t);
    }

    function bottomup(fn, t) {
      return seq(all.curry(bottomup.curry(fn)), fn, t);
    }

    function innermost(fn, t) {
      return bottomup(attempt.curry(seq.curry(fn, innermost.curry(fn))), t);
    }

    function collect(fn, t) {
      var results = [];
      alltd(function(t) {
          if(fn(t)) {
            results.push(t);
            return t;
          } else {
            return null;
          }
        }, t);
      return new ast.ListNode(results);
    }

    traversal.topdown = topdown;
    traversal.bottomup = bottomup;
    traversal.innermost = innermost;
    traversal.collect = collect;

    return traversal;
  });
