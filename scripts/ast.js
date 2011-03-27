
define(function () {
    var ast = {};

    var AST_CONS = 0;
    var AST_LIST = 1;
    var AST_INT = 2;
    var AST_STRING = 3;
    var AST_PLACEHOLDER = 4;

    ast.AST_CONS = AST_CONS;
    ast.AST_LIST = AST_LIST;
    ast.AST_INT = AST_INT;
    ast.AST_STRING = AST_STRING;
    ast.AST_PLACEHOLDER = AST_PLACEHOLDER;

    function Node(type) {
      this.type = type;
    }

    Node.prototype.toPrettyString = function(prefix) {
      return prefix + this.toString();
    };
    
    Node.prototype.hasFailed = function() {
        return false;
    };
    
    function FailNode(t, meta) {
        this.t = t;
        this.meta = meta || {};
    }
    
    FailNode.prototype.hasFailed = function() {
        return true;
    };
    
    FailNode.prototype.toString = function() {
        return "FAIL: " + this.t.toString();
    };

    function ConsNode(cons, children, meta) {
      this.cons = cons;
      this.children = children || [];
      this.meta = meta || {};
    }

    ConsNode.prototype = new Node(AST_CONS);

    ConsNode.prototype.toString = function(prefix) {
      try {
        var s = this.cons + "(";
        for ( var i = 0; i < this.children.length; i++) {
          s += this.children[i].toString() + ",";
        }
        if (this.children.length > 0) {
          s = s.substring(0, s.length - 1);
        }
        return s + ")";
      } catch(e) {
        console.error("Something went wrong: ", this, e);
      }
    };

    ConsNode.prototype.toPrettyString = function(prefix) {
      try {
        if(this.children.length === 0) {
          return prefix + this.cons + "()";
        }
        var s = prefix + this.cons + "(\n";
        for ( var i = 0; i < this.children.length; i++) {
          s += this.children[i].toPrettyString(prefix + "  ") + ",\n";
        }
        s = s.substring(0, s.length - 2);
        s += "\n";
        return s + prefix + ")";
      } catch(e) {
        console.error("Something went wrong: ", this, e);
      }
    };

    ConsNode.prototype.match = function(t, matches) {
      if (t.type === AST_CONS) {
        if (this.cons === t.cons) {
          if (this.children.length === t.children.length) {
            for ( var i = 0; i < this.children.length; i++) {
              if (!this.children[i].match(t.children[i], matches)) {
                return false;
              }
            }
            return true;
          }
        }
      }
      return false;
    };

    ConsNode.prototype.build = function(values) {
      var children = [];
      for ( var i = 0; i < this.children.length; i++) {
        children.push(this.children[i].build(values));
      }
      return new ConsNode(this.cons, children);
    };

    function ListNode (children, meta) {
      this.children = children;
      this.meta = meta || {};
    }

    ListNode.prototype = new Node(AST_LIST);

    ListNode.prototype.toString = function() {
      var s = "[";
      for ( var i = 0; i < this.children.length; i++) {
        s += this.children[i].toString() + ",";
      }
      if (this.children.length > 0) {
        s = s.substring(0, s.length - 1);
      }
      return s + "]";
    };

    ListNode.prototype.toPrettyString = function(prefix) {
      try {
        if(this.children.length === 0) {
          return prefix + "[]";
        }
        var s = prefix + "[\n";
        for ( var i = 0; i < this.children.length; i++) {
          s += this.children[i].toPrettyString(prefix + "  ") + ",\n";
        }
        s = s.substring(0, s.length - 2);
        s += "\n";
        return s + prefix + "]";
      } catch(e) {
        console.error("Something went wrong: ", this);
      }
    };

    ListNode.prototype.match = function(t, matches) {
      if (t.type === AST_LIST) {
        if (this.children.length === t.children.length) {
          for ( var i = 0; i < this.children.length; i++) {
            if (!this.children[i].match(t.children[i], matches)) {
              return false;
            }
          }
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    };

    ListNode.prototype.build = function(values) {
      var children = [];
      for ( var i = 0; i < this.children.length; i++) {
        children.push(this.children[i].build(values));
      }
      return new ListNode(children);
    };

    ListNode.prototype.forEach = function(fn) {
      this.children.forEach(fn);
    };

    ListNode.prototype.isEmpty = function() {
      return this.children.length === 0;
    };

    function IntNode (n, meta) {
      this.n = n;
      this.meta = meta || {};
    }

    IntNode.prototype = new Node(AST_INT);

    IntNode.prototype.toString = function() {
      return this.n;
    };

    IntNode.prototype.match = function(t, matches) {
      if (t.type === AST_INT) {
        return this.n === t.n;
      } else {
        return false;
      }
    };

    IntNode.prototype.build = function(values) {
      return this;
    };

    function StringNode (s, meta) {
      this.s = s;
      this.meta = meta || {};
    }

    StringNode.prototype = new Node(AST_STRING);

    StringNode.prototype.toString = function() {
      return '"' + this.s + '"';
    };

    StringNode.prototype.match = function(t, matches) {
      if (t.type === AST_STRING) {
        return this.s === t.s;
      } else {
        return false;
      }
    };

    StringNode.prototype.build = function(values) {
      return this;
    };

    function PlaceholderNode(id, pos) {
      this.id = id;
      this.pos = pos;
    }

    PlaceholderNode.prototype = new Node(AST_PLACEHOLDER);

    PlaceholderNode.prototype.toString = function() {
      return '<' + this.id + '>';
    };

    PlaceholderNode.prototype.match = function(t, matches) {
      if(matches[this.id]) { // already bound
        return matches[this.id].match(t);
      } else {
        matches[this.id] = t;
        return true;
      }
    };

    PlaceholderNode.prototype.build = function(values) {
      return values[this.id];
    };

    ast.Node = Node;
    ast.FailNode = FailNode;
    ast.ConsNode = ConsNode;
    ast.ListNode = ListNode;
    ast.IntNode = IntNode;
    ast.StringNode = StringNode;
    ast.PlaceholderNode = PlaceholderNode;

    function parse (s) {
      var idx = 0;
      function accept (str) {
        for ( var i = 0; i < str.length && idx + i < s.length; i++) {
          if (str[i] != s[idx + i]) {
            return false;
          }
        }
        return i == str.length;
      }
      function skipWhitespace () {
        while (idx < s.length && (s[idx] === " " || s[idx] === "\n" || s[idx] === "\r" || s[idx] === "\t")) {
          idx++;
        }
      }
      function parseInt () {
        var pos = idx;
        if (s[idx] >= '0' && s[idx] <= '9') {
          var ns = s[idx];
          idx++;
          while (idx < s.length && s[idx] >= '0' && s[idx] <= '9') {
            ns += s[idx];
            idx++;
          }
          skipWhitespace();
          return new IntNode(+ns, pos);
        } else {
          return null;
        }
      }
      function parseString () {
        var pos = idx;
        if (accept('"')) {
          var ns = "";
          idx++;
          while (!accept('"') || (accept('"') && s[idx - 1] == '\\')) {
            ns += s[idx];
            idx++;
          }
          var ns2 = '';
          for ( var i = 0; i < ns.length; i++) {
            if (ns[i] == "\\") {
              i++;
              switch (ns[i]) {
              case 'n':
                ns2 += "\n";
                break;
              case 't':
                ns2 += "\t";
                break;
              default:
                ns2 += ns[i];
              }
            } else {
              ns2 += ns[i];
            }
          }
          idx++;
          skipWhitespace();
          return new StringNode(ns2, pos);
        } else {
          return null;
        }
      }
      function parsePlaceholder () {
        var pos = idx;
        if (accept('<')) {
          var ns = "";
          idx++;
          while (!accept('>')) {
            ns += s[idx];
            idx++;
          }
          idx++;
          skipWhitespace();
          return new PlaceholderNode(ns, pos);
        } else {
          return null;
        }
      }
      function parseList () {
        var pos = idx;
        if (accept('[')) {
          var items = [];
          idx++;
          skipWhitespace();
          while (!accept(']')) {
            items.push(parseExp());
            if (accept(',')) {
              idx++; // skip comma
              skipWhitespace();
            }
          }
          idx++;
          skipWhitespace();
          return new ListNode(items, pos);
        } else {
          return null;
        }
      }
      function parseCons () {
        var pos = idx;
        // assumption: it's an appl
        var ns = "";
        while (!accept('(')) {
          ns += s[idx];
          idx++;
        }
        idx++; // skip (
        var items = [];
        while (!accept(')')) {
          items.push(parseExp());
          if (accept(',')) {
            idx++; // skip comma
            skipWhitespace();
          }
        }
        idx++;
        skipWhitespace();
        return new ConsNode(ns, items, pos);
      }

      function parseExp () {
        var r = parseInt();
        if (r)
          return r;
        r = parseString();
        if (r)
          return r;
        r = parseList();
        if (r)
          return r;
        r = parsePlaceholder();
        if (r)
          return r;
        return parseCons();
      }

      return parseExp();
    }

    ast.parse = parse;

    return ast;
  });
