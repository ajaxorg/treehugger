
define(["ast"], function(ast) {
    var traversal = {};

    if (!Function.prototype.curry) {
      Function.prototype.curry = function () {
        var fn = this, args = Array.prototype.slice.call(arguments);
        return function () {
          return fn.apply(this, args.concat(Array.prototype.slice.call(arguments)));
        };
      };
    }

    function all (fn, t) {
      switch (t.type) {
      case ast.AST_CONS:
        var newChildren = [];
        var result;
        for ( var i = 0; i < t.children.length; i++) {
          result = fn(t.children[i]);
          if (result !== null) {
            newChildren.push(result);
          } else {
            return null;
          }
        }
        return new ast.ConsNode(t.cons, newChildren);
        break;
      case ast.AST_LIST:
        var newChildren = [];
        var result;
        for ( var i = 0; i < t.children.length; i++) {
          result = fn(t.children[i]);
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
        return t;
      default:
        console.log("FAIL: ", t);
        return null;
        break;
      }
    }

    function one (fn, t) {
      switch (t.type) {
      case ast.AST_CONS:
        var newChildren = [];
        var result;
        var oneSucceeded = false;
        for ( var i = 0; i < t.children.length; i++) {
          result = fn(t.children[i]);
          if (result !== null) {
            newChildren.push(result);
            oneSucceeded = true;
          } else {
            newChildren.push(t.children[i]);
          }
        }
        if (oneSucceeded) {
          return new ast.ConsNode(t.cons, newChildren);
        } else {
          return null;
        }
        break;
      case ast.AST_LIST:
        var newChildren = [];
        var result;
        var oneSucceeded = false;
        for ( var i = 0; i < t.children.length; i++) {
          result = fn(t.children[i]);
          if (result !== null) {
            newChildren.push(result);
            oneSucceeded = true;
          } else {
            newChildren.push(t.children[i]);
          }
        }
        if (oneSucceeded) {
          return new ast.ListNode(t.cons, newChildren);
        } else {
          return null;
        }
        break;
      case ast.AST_INT:
      case ast.AST_STRING:
      case ast.AST_PLACEHOLDER:
        return t;
      }
    }

    /**
     * Sequential application last argument is term
     */
    function seq () {
      var t = arguments[arguments.length - 1];
      var fn;
      for ( var i = 0; i < arguments.length - 1; i++) {
        fn = arguments[i];
        t = fn(t);
        if (t === null) {
          return null;
        }
      }
      return t;
    }

    /**
     * Left-choice (<+) application last argument is term
     */
    function leftChoice () {
      var t = arguments[arguments.length - 1];
      var fn, result;
      for ( var i = 0; i < arguments.length - 1; i++) {
        fn = arguments[i];
        result = fn(t);
        if (result !== null) {
          return result;
        }
      }
      return null;
    }

    // Try
    function attempt (fn, t) {
      var result = fn(t);
      return result !== null ? result : t;
    }

    function debug (t) {
      console.log(t.toString());
      return t;
    }

    function alltd (fn, t) {
      return leftChoice(fn, all.curry(alltd.curry(fn)), t);
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

    traversal.all = all;
    traversal.one = one;
    traversal.seq = seq;
    traversal.leftChoice = leftChoice;
    traversal.attempt = attempt;
    traversal.debug = debug;
    traversal.alltd = alltd;
    traversal.topdown = topdown;
    traversal.bottomup = bottomup;
    traversal.innermost = innermost;
    traversal.collect = collect;

    return traversal;
  });
