define(function(require, exports, module) {

require('js/narcissus/jsdefs');
require('js/narcissus/jslex');
require('js/narcissus/jsparse');

var ast = require('ast');

exports.parse = function(s) {
  try {
    var n = Narcissus.parser.parse(s);
    return exports.transform(n);
  } catch(e) {
    return new ast.StringNode("Invalid Javascript: " + e.toString());
  }
};

exports.transform = function(n) {
  var meta = {line: n.lineno, pos: n.start},
      transform = exports.transform;
  switch(Narcissus.definitions.tokens[n.type]) {
  case "SCRIPT":
    return new ast.ConsNode("Block", [new ast.ListNode(n.children.map(transform))], meta);
  case "BLOCK":
    return new ast.ConsNode("Block", [new ast.ListNode(n.children.map(transform))], meta);
  case "function":
    return new ast.ConsNode("Function", [new ast.StringNode(n.name), new ast.ListNode(n.params.map(function(a) {
              return new ast.StringNode(a); 
            })), transform(n.body)], meta);
  case "var":
    return new ast.ConsNode("VarDecls", [new ast.ListNode(n.children.map(function(vardec) {
        return new ast.ConsNode("VarDecl", [new ast.StringNode(vardec.name), transform(vardec.initializer)], meta);
      }))], meta);
  case "return":
    return new ast.ConsNode("Return", [transform(n.value)], meta);
  case "=":
    return new ast.ConsNode("Assign", [transform(n.children[0]), transform(n.children[1])], meta);
  case "true":
    return new ast.ConsNode("True", [], meta);
  case "false":
    return new ast.ConsNode("True", [], meta);
  case "if":
    return new ast.ConsNode("If", [transform(n.condition), transform(n.thenPart), n.elsePart ? transform(n.elsePart) : new ast.ConsNode("None", [])], meta);
  case "STRING":
    return new ast.ConsNode("StringLit", [new ast.StringNode(n.value)], meta);
  case "NUMBER":
    return new ast.ConsNode("NumLit", [new ast.StringNode(n.value)], meta);
  case ";": // expstat
    return new ast.ConsNode("ExpStat", [transform(n.expression)], meta);
  case "CALL":
    return new ast.ConsNode("Call", [transform(n.children[0]), new ast.ListNode(n.children[1].children.map(transform))], meta);
  case "NEW_WITH_ARGS":
    return new ast.ConsNode("New", [transform(n.children[0]), new ast.ListNode(n.children[1].children.map(transform))], meta);
  case "OBJECT_INIT":
    return new ast.ConsNode("ObjectInit", [transform(n.children[0]), new ast.ListNode(n.children[1].children.map(transform))], meta);
  case ".":
    return new ast.ConsNode("FieldAccess", [transform(n.children[0]), new ast.StringNode(n.children[1].value)], meta);
  case "IDENTIFIER":
    return new ast.ConsNode("Var", [new ast.StringNode(n.value)], meta);
  case "+":
    return new ast.ConsNode("Op", [new ast.StringNode("+"), transform(n.children[0]), transform(n.children[1])], meta);
  case "-":
    return new ast.ConsNode("Op", [new ast.StringNode("-"), transform(n.children[0]), transform(n.children[1])], meta);
  case "/":
    return new ast.ConsNode("Op", [new ast.StringNode("/"), transform(n.children[0]), transform(n.children[1])], meta);
  case "*":
    return new ast.ConsNode("Op", [new ast.StringNode("*"), transform(n.children[0]), transform(n.children[1])], meta);
  case "||":
    return new ast.ConsNode("Op", [new ast.StringNode("||"), transform(n.children[0]), transform(n.children[1])], meta);
  case "&&":
    return new ast.ConsNode("Op", [new ast.StringNode("&&"), transform(n.children[0]), transform(n.children[1])], meta);
  case "!":
    return new ast.ConsNode("Op", [new ast.StringNode("!"), transform(n.children[0])], meta);
  case "REGEXP":
    return new ast.ConsNode("RegExp", [new ast.StringNode(n.value.toString())], meta);
  default:
    console.log("Not yet supported: ", n, Narcissus.definitions.tokens[n.type]);
  }
};

});
