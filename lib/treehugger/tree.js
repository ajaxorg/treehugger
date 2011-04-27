define(function(require, exports, module) {

/**
 * Base 'class' of every tree node
 */
function Node() {
}

Node.prototype.toPrettyString = function(prefix) {
  prefix = prefix || "";
  return prefix + this.toString();
};

Node.prototype.getPos = function() {
  if(this.meta.pos) {
    return this.meta.pos;
  } else {
    return null;
  }
};

Node.prototype.findNode = function(pos) {
  var p = this.getPos();
  if(p && pos >= p) {
    return this;
  } else {
    return null;
  }
};

/**
 * Represents a constructor node
 * 
 * Example: Add(Num("1"), Num("2")) is constucted
 *  using new ConsNode(new ConsNode("Num", [new StringNode("1")]),
 *                     new ConsNode("Num", [new StringNode("2")]))
 *  or, more briefly:
 *    tree.cons("Add", [tree.cons("Num", [ast.string("1"), ast.string("2")])])
 */
function ConsNode(cons, children, meta) {
  this.cons = cons;
  for(var i = 0; i < children.length; i++) {
    this[i] = children[i];
  }
  this.length = children.length;
  this.meta = meta || {};
}

ConsNode.prototype = new Node();

/**
 * Simple human-readable string representation (no indentation)
 */
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

/**
 * Human-readable string representation (indentented)
 * @param prefix is for internal use
 */
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

/**
 * Matches the current term against `t`, writing matching placeholder values to `matches`
 * @param t the node to match against
 * @param matches the object to write placeholder values to
 * @returns the `matches` object if it matches, false otherwise
 */
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

/**
 * Builds a node, based on values (similar to `matches` object),
 * replacing placeholder nodes with values from `values`
 * @returns resulting cons node
 */
ConsNode.prototype.build = function(values) {
  var children = [];
  for ( var i = 0; i < this.length; i++) {
    children.push(this[i].build(values));
  }
  return new ConsNode(this.cons, children);
};

/**
 * Prettier JSON representation of constructor node.
 */
ConsNode.prototype.toJSON = function() {
  var l = [];
  for(var i = 0; i < this.length; i++) {
    l.push(this[i]);
  }
  return {cons: this.cons, children: l};
};

ConsNode.prototype.getPos = function() {
  var pos = 9999999999;
  if(this.meta.pos) {
    pos = this.meta.pos;
  }
  for(var i = 0; i < this.length; i++) {
    var p = this[i].getPos();
    if(p) {
      pos = Math.min(pos, p);
    }
  }
  return pos;
};

ConsNode.prototype.findNode = function(pos) {
  var p = this.getPos();
  if(p && pos >= p) {
    for(var i = this.length-1; i >= 0; i--) {
      var p2 = this[i].getPos();
      if(p2 && pos >= p2) {
        var node = this[i].findNode(pos);
        return node instanceof StringNode ? this : node;
      }
    }
    return this;
  } else {
    return null;
  }
};

/**
 * Constructor node factory.
 */
exports.cons = function(name, children, meta) {
  return new ConsNode(name, children, meta);
};

/**
 * AST node representing a list
 * e.g. for constructors with variable number of arguments, e.g. in
 *      Call(Var("alert"), [Num("10"), Num("11")])
 * 
 */
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

ListNode.prototype.getPos = ConsNode.prototype.getPos;
ListNode.prototype.findNode = ConsNode.prototype.findNode;

/**
 * forEach implementation, similar to Array.prototype.forEach
 */
ListNode.prototype.forEach = function(fn) {
  for(var i = 0; i < this.length; i++) {
    fn.call(this[i], this[i]);
  }
};

/**
 * Whether the list is empty (0 elements)
 */
ListNode.prototype.isEmpty = function() {
  return this.length === 0;
};

/**
 * Performs linear search, performing a match
 * with each element in the list
 * @param el the element to search for
 * @returns true if found, false if not
 */
ListNode.prototype.contains = function(el) {
  for(var i = 0; i < this.length; i++) {
    if(el.match(this[i])) {
      return true;
    }
  }
  return false;
};

/**
 * Concatenates list with another list, similar to Array.prototype.concat
 */
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

ListNode.prototype.toJSON = function() {
  var l = [];
  for(var i = 0; i < this.length; i++) {
    l.push(this[i]);
  }
  return l;
};

/**
 * Returns a new list node, with all duplicates removed
 * Note: cubic complexity algorithm used
 */
ListNode.prototype.removeDuplicates = function() {
  var newList = [];
  lbl: for(var i = 0; i < this.length; i++) {
    for(var j = 0; j < newList.length; j++) {
      if(newList[j].match(this[i])) {
        continue lbl;
      }
    }
    newList.push(this[i]);
  }
  return new exports.list(newList);
};

ListNode.prototype.toArray = ListNode.prototype.toJSON;

/**
 * ListNode factory
 */
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
  return this.id;
};

PlaceholderNode.prototype.match = function(t, matches) {
  matches = matches || {};
  if(this.id === '_') {
    return matches;
  }
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

var parseCache = {};

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
  function lookAheadLetter() {
    return s[idx] >= 'a' && s[idx] <= 'z' || s[idx] >= 'A' && s[idx] <= 'Z' || s[idx] === '_' || s[idx] >= '0' && s[idx] <= '9';
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
    if(lookAheadLetter() && s[idx].toLowerCase() === s[idx]) {
      var ns = "";
      while (lookAheadLetter() && idx < s.length) {
        ns += s[idx];
        idx++;
      }
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
      while (!accept(']') && idx < s.length) {
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
    while (!accept(')') && idx < s.length) {
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
  
  if(s.length < 200 && !parseCache[s]) {
    parseCache[s] = parseExp();
  } else if(!parseCache[s]) {
    return parseExp();
  }
  return parseCache[s];
}

exports.Node = Node;
exports.ConsNode = ConsNode;
exports.ListNode = ListNode;
exports.NumNode = NumNode;
exports.StringNode = StringNode;
exports.PlaceholderNode = PlaceholderNode;
exports.parse = parse;

});
