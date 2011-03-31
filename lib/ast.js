define(function(require, exports, module) {
  
function Node() {
}

Node.prototype.toPrettyString = function(prefix) {
  prefix = prefix || "";
  return prefix + this.toString();
};

function ConsNode(cons, children, meta) {
  this.cons = cons;
  for(var i = 0; i < children.length; i++) {
    this[i] = children[i];
  }
  this.length = children.length;
  this.meta = meta || {};
}

ConsNode.prototype = new Node();

ConsNode.prototype.toString = function(prefix) {
  try {
    var s = this.cons + "(";
    for ( var i = 0; i < this.length; i++) {
      s += this[i].toString() + ",";
    }
    if (this.length > 0) {
      s = s.substring(0, s.length - 1);
    }
    return s + ")";
  } catch(e) {
    console.error("Something went wrong: ", this, e);
  }
};

ConsNode.prototype.toPrettyString = function(prefix) {
  prefix = prefix || "";
  try {
    if(this.length === 0) {
      return prefix + this.cons + "()";
    }
    if(this.length === 1 && (this[0] instanceof StringNode || this[0] instanceof NumNode)) {
      return prefix + this.cons + "(" + this[0].toString() + ")";
    }
    var s = prefix + this.cons + "(\n";
    for ( var i = 0; i < this.length; i++) {
      s += this[i].toPrettyString(prefix + "  ") + ",\n";
    }
    s = s.substring(0, s.length - 2);
    s += "\n";
    return s + prefix + ")";
  } catch(e) {
    console.error("Something went wrong: ", this, e);
  }
};

ConsNode.prototype.match = function(t, matches) {
  matches = matches || {};
  if (t instanceof ConsNode) {
    if (this.cons === t.cons) {
      if (this.length === t.length) {
        for ( var i = 0; i < this.length; i++) {
          if (!this[i].match(t[i], matches)) {
            return false;
          }
        }
        return matches;
      }
    }
  }
  return false;
};

ConsNode.prototype.build = function(values) {
  var children = [];
  for ( var i = 0; i < this.length; i++) {
    children.push(this[i].build(values));
  }
  return new ConsNode(this.cons, children);
};

exports.cons = function(name, children, meta) {
  return new ConsNode(name, children, meta);
};

function ListNode (children, meta) {
  for(var i = 0; i < children.length; i++) {
    this[i] = children[i];
  }
  this.length = children.length;
  this.meta = meta || {};
}

ListNode.prototype = new Node();

ListNode.prototype.toString = function() {
  var s = "[";
  for ( var i = 0; i < this.length; i++) {
    s += this[i].toString() + ",";
  }
  if (this.length > 0) {
    s = s.substring(0, s.length - 1);
  }
  return s + "]";
};

ListNode.prototype.toPrettyString = function(prefix) {
  prefix = prefix || "";
  try {
    if(this.length === 0) {
      return prefix + "[]";
    }
    var s = prefix + "[\n";
    for ( var i = 0; i < this.length; i++) {
      s += this[i].toPrettyString(prefix + "  ") + ",\n";
    }
    s = s.substring(0, s.length - 2);
    s += "\n";
    return s + prefix + "]";
  } catch(e) {
    console.error("Something went wrong: ", this);
  }
};

ListNode.prototype.match = function(t, matches) {
  matches = matches || {};
  if (t instanceof ListNode) {
    if (this.length === t.length) {
      for ( var i = 0; i < this.length; i++) {
        if (!this[i].match(t[i], matches)) {
          return false;
        }
      }
      return matches;
    } else {
      return false;
    }
  } else {
    return false;
  }
};

ListNode.prototype.build = function(values) {
  var children = [];
  for ( var i = 0; i < this.length; i++) {
    children.push(this[i].build(values));
  }
  return new ListNode(children);
};

ListNode.prototype.forEach = function(fn) {
  for(var i = 0; i < this.length; i++) {
    fn.call(this[i], this[i]);
  }
};

ListNode.prototype.isEmpty = function() {
  return this.length === 0;
};

ListNode.prototype.contains = function(el) {
  for(var i = 0; i < this.length; i++) {
    if(el.match(this[i])) {
      return true;
    }
  }
  return false;
};

ListNode.prototype.concat = function(l) {
  var ar = [];
  for(var i = 0; i < this.length; i++) {
    ar.push(this[i]);
  }
  for(i = 0; i < l.length; i++) {
    ar.push(l[i]);
  }
  return exports.list(ar);
};

exports.list = function(elements, meta) {
  return new ListNode(elements, meta);
};

function NumNode (value, meta) {
  this.value = value;
  this.meta = meta || {};
}

NumNode.prototype = new Node();

NumNode.prototype.toString = function() {
  return ""+this.value;
};

NumNode.prototype.match = function(t, matches) {
  matches = matches || {};
  if (t instanceof NumNode) {
    return this.value === t.value ? matches : false;
  } else {
    return false;
  }
};

NumNode.prototype.build = function(values) {
  return this;
};

exports.num = function(value, meta) {
  return new NumNode(value, meta);
};

function StringNode (value, meta) {
  this.value = value;
  this.meta = meta || {};
}

StringNode.prototype = new Node();

StringNode.prototype.toString = function() {
  return '"' + this.value + '"';
};

StringNode.prototype.match = function(t, matches) {
  matches = matches || {};
  if (t instanceof StringNode) {
    return this.value === t.value ? matches : false;
  } else {
    return false;
  }
};

StringNode.prototype.build = function(values) {
  return this;
};

exports.string = function(value, meta) {
  return new StringNode(value, meta);
};

function PlaceholderNode(id, meta) {
  this.id = id;
  this.meta = meta || {};
}

PlaceholderNode.prototype = new Node();

PlaceholderNode.prototype.toString = function() {
  return '<' + this.id + '>';
};

PlaceholderNode.prototype.match = function(t, matches) {
  matches = matches || {};
  if(matches[this.id]) { // already bound
    return matches[this.id].match(t);
  } else {
    matches[this.id] = t;
    return matches;
  }
};

PlaceholderNode.prototype.build = function(values) {
  return values[this.id];
};

exports.placeholder = function(n, meta) {
  return new PlaceholderNode(n, meta);
};

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
      return new NumNode(+ns, pos);
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
  
  if(typeof s !== 'string') {
    return null;
  }

  return parseExp();
}

exports.Node = Node;
exports.ConsNode = ConsNode;
exports.ListNode = ListNode;
exports.NumNode = NumNode;
exports.StringNode = StringNode;
exports.PlaceholderNode = PlaceholderNode;
exports.parse = parse;

});
