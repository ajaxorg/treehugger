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
    return ast.string("Invalid Javascript: " + e.toString());
  }
};

exports.transform = function(n) {
  var meta = {line: n.lineno, pos: n.start},
      transform = exports.transform;
  switch(Narcissus.definitions.tokens[n.type]) {
    case "SCRIPT":
      return ast.cons("Block", [ast.list(n.children.map(transform))], meta);
    case "BLOCK":
      return ast.cons("Block", [ast.list(n.children.map(transform))], meta);
    case "function":
      return ast.cons("Function", [ast.string(n.name), ast.list(n.params.map(function(a) {
                return ast.string(a); 
              })), transform(n.body)], meta);
    case "var":
      return ast.cons("VarDecls", [ast.list(n.children.map(function(vardec) {
          return ast.cons("VarDecl", [ast.string(vardec.name), transform(vardec.initializer)], meta);
        }))], meta);
    case "return":
      return ast.cons("Return", [transform(n.value)], meta);
    case "this":
      return ast.cons("This", [], meta);
    case "=":
      return ast.cons("Assign", [transform(n.children[0]), transform(n.children[1])], meta);
    case "true":
      return ast.cons("True", [], meta);
    case "false":
      return ast.cons("True", [], meta);
    case "if":
      return ast.cons("If", [transform(n.condition), transform(n.thenPart), n.elsePart ? transform(n.elsePart) : ast.cons("None", [])], meta);
    case "STRING":
      return ast.cons("String", [ast.string(n.value)], meta);
    case "NUMBER":
      return ast.cons("Number", [ast.string(n.value)], meta);
    case ";": // expstat
      return ast.cons("ExpStat", [transform(n.expression)], meta);
    case "CALL":
      return ast.cons("Call", [transform(n.children[0]), ast.list(n.children[1].children.map(transform))], meta);
    case "NEW_WITH_ARGS":
      return ast.cons("New", [transform(n.children[0]), ast.list(n.children[1].children.map(transform))], meta);
    case ".":
      return ast.cons("PropAccess", [transform(n.children[0]), ast.string(n.children[1].value)], meta);
    case "IDENTIFIER":
      return ast.cons("Var", [ast.string(n.value)], meta);
    case "+":
      return ast.cons("Op", [ast.string("+"), transform(n.children[0]), transform(n.children[1])], meta);
    case "-":
      return ast.cons("Op", [ast.string("-"), transform(n.children[0]), transform(n.children[1])], meta);
    case "/":
      return ast.cons("Op", [ast.string("/"), transform(n.children[0]), transform(n.children[1])], meta);
    case "*":
      return ast.cons("Op", [ast.string("*"), transform(n.children[0]), transform(n.children[1])], meta);
    case "||":
      return ast.cons("Op", [ast.string("||"), transform(n.children[0]), transform(n.children[1])], meta);
    case "&&":
      return ast.cons("Op", [ast.string("&&"), transform(n.children[0]), transform(n.children[1])], meta);
    case "!":
      return ast.cons("Op", [ast.string("!"), transform(n.children[0])], meta);
    case "REGEXP":
      return ast.cons("RegExp", [ast.string(n.value.toString())], meta);
    default:
      console.log("Not yet supported: ", n, Narcissus.definitions.tokens[n.type]);
  }
};

});
