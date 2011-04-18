define(function(require, exports, module) {

var parser = require("ace/narcissus/jsparse"),
    tokens = require("ace/narcissus/jsdefs").tokens,
    tree = require('treehugger/tree');

exports.parse = function(s) {
  try {
    var n = parser.parse(s);
    return exports.transform(n);
  } catch(e) {
    return tree.string("Invalid Javascript: " + e.toString());
  }
};

exports.transform = function(n) {
  if(!n) {
    return tree.cons("None", []);
  }
  var meta = {line: n.lineno, pos: n.start},
      transform = exports.transform;
  switch(tokens[n.type]) {
    case "SCRIPT":
      return tree.cons("Block", [tree.list(n.children.map(transform))], meta);
    case "BLOCK":
      return tree.cons("Block", [tree.list(n.children.map(transform))], meta);
    case "OBJECT_INIT":
      return tree.cons("ObjectInit", [tree.list(n.children.map(transform))], meta);
    case "PROPERTY_INIT":
      return tree.cons("PropertyInit", [tree.string(n.children[0].value), transform(n.children[1])], meta);
    case "ARRAY_INIT":
      return tree.cons("ArrayInit", [tree.list(n.children.map(transform))], meta);
    case "try":
      return tree.cons("Try", [transform(n.tryBlock), tree.list(n.catchClauses.map(transform))], meta);
    case "catch":
      return tree.cons("Catch", [tree.string(n.varName), transform(n.block)], meta);
    case "function":
      return tree.cons("Function", [n.name ? tree.string(n.name) : tree.string(""), tree.list(n.params.map(function(a) {
                return tree.string(a); 
              })), transform(n.body)], meta);
    case "switch":
      return tree.cons("Switch", [transform(n.discriminant), tree.list(n.cases.map(transform))], meta);
    case "case":
      return tree.cons("Case", [transform(n.caseLabel), tree.list(n.statements.children.map(transform))], meta);
    case ",":
      return tree.cons("Comma", [tree.list(n.children.map(transform))], meta);
    case "break":
      return tree.cons("Break", [], meta);
    case "default":
      return tree.cons("DefaultCase", [tree.list(n.statements.children.map(transform))], meta);
    case "var":
      return tree.cons("VarDecls", [tree.list(n.children.map(function(vardec) {
        if(vardec.initializer) {
          return tree.cons("VarDeclInit", [tree.string(vardec.name), transform(vardec.initializer)], meta);
        } else {
          return tree.cons("VarDecl", [tree.string(vardec.name)], meta);
        }
      }))], meta);
    case "const":
      return tree.cons("ConstDecls", [tree.list(n.children.map(function(vardec) {
        return tree.cons("ConstDeclInit", [tree.string(vardec.name), transform(vardec.initializer)], meta);
      }))], meta);
    case "return":
      return tree.cons("Return", [transform(n.value)], meta);
    case "LABEL":
      return tree.cons("Label", [tree.string(n.label), transform(n.statement)], meta);
    case "GETTER":
      return tree.cons("Getter", [tree.string(n.name), transform(n.body)], meta);
    case "throw":
      return tree.cons("Throw", [transform(n.exception)], meta);
    case "in":
      return tree.cons("In", [transform(n.children[0]), transform(n.children[1])], meta);
    case "INDEX":
      return tree.cons("Index", [transform(n.children[0]), transform(n.children[1])], meta);
    case "?":
      return tree.cons("TernaryIf", [transform(n.children[0]), transform(n.children[1]), transform(n.children[2])], meta);
    case "this":
      return tree.cons("This", [], meta);
    case "=":
      return tree.cons("Assign", [transform(n.children[0]), transform(n.children[1])], meta);
    case "true":
      return tree.cons("True", [], meta);
    case "false":
      return tree.cons("True", [], meta);
    case "null":
      return tree.cons("Null", [], meta);
    case "continue":
      return tree.cons("Continue", [], meta);
    case "delete":
      return tree.cons("Delete", [transform(n.children[0])], meta);
    case "if":
      return tree.cons("If", [transform(n.condition), transform(n.thenPart), transform(n.elsePart)], meta);
    case "while":
      return tree.cons("While", [transform(n.condition), transform(n.body)], meta);
    case "do":
      return tree.cons("DoWhile", [transform(n.body), transform(n.condition)], meta);
    case "for":
      return tree.cons("For", [transform(n.setup), transform(n.condition), transform(n.update), transform(n.body)], meta);
    case "FOR_IN":
      return tree.cons("ForIn", [transform(n.iterator), transform(n.object), transform(n.body)], meta);
    case "STRING":
      return tree.cons("String", [tree.string(n.value)], meta);
    case "NUMBER":
      return tree.cons("Number", [tree.string(n.value)], meta);
    case ";": // expstat
      return tree.cons("ExpStat", [transform(n.expression)], meta);
    case "CALL":
      return tree.cons("Call", [transform(n.children[0]), tree.list(n.children[1].children.map(transform))], meta);
    case "NEW_WITH_ARGS":
      return tree.cons("New", [transform(n.children[0]), tree.list(n.children[1].children.map(transform))], meta);
    case ".":
      return tree.cons("PropAccess", [transform(n.children[0]), tree.string(n.children[1].value)], meta);
    case "IDENTIFIER":
      return tree.cons("Var", [tree.string(n.value)], meta);
    case "typeof":
      return tree.cons("TypeOf", [transform(n.children[0])], meta);
    case "instanceof":
      return tree.cons("InstanceOf", [transform(n.children[0]), transform(n.children[1])], meta);
    case "!==":
      return tree.cons("Op", [tree.string("!=="), transform(n.children[0]), transform(n.children[1])], meta);
    case "===":
      return tree.cons("Op", [tree.string("==="), transform(n.children[0]), transform(n.children[1])], meta);
    case "!=":
      return tree.cons("Op", [tree.string("!="), transform(n.children[0]), transform(n.children[1])], meta);
    case "==":
      return tree.cons("Op", [tree.string("=="), transform(n.children[0]), transform(n.children[1])], meta);
    case "<":
      return tree.cons("Op", [tree.string("<"), transform(n.children[0]), transform(n.children[1])], meta);
    case "<=":
      return tree.cons("Op", [tree.string("<="), transform(n.children[0]), transform(n.children[1])], meta);
    case ">":
      return tree.cons("Op", [tree.string(">"), transform(n.children[0]), transform(n.children[1])], meta);
    case ">=":
      return tree.cons("Op", [tree.string(">="), transform(n.children[0]), transform(n.children[1])], meta);
    case "+":
      return tree.cons("Op", [tree.string("+"), transform(n.children[0]), transform(n.children[1])], meta);
    case "-":
      return tree.cons("Op", [tree.string("-"), transform(n.children[0]), transform(n.children[1])], meta);
    case "/":
      return tree.cons("Op", [tree.string("/"), transform(n.children[0]), transform(n.children[1])], meta);
    case "*":
      return tree.cons("Op", [tree.string("*"), transform(n.children[0]), transform(n.children[1])], meta);
    case "||":
      return tree.cons("Op", [tree.string("||"), transform(n.children[0]), transform(n.children[1])], meta);
    case "&&":
      return tree.cons("Op", [tree.string("&&"), transform(n.children[0]), transform(n.children[1])], meta);
    case "|":
      return tree.cons("Op", [tree.string("|"), transform(n.children[0]), transform(n.children[1])], meta);
    case "&":
      return tree.cons("Op", [tree.string("&"), transform(n.children[0]), transform(n.children[1])], meta);
    case "%":
      return tree.cons("Op", [tree.string("%"), transform(n.children[0]), transform(n.children[1])], meta);
    case "UNARY_MINUS":
      return tree.cons("Op", [tree.string("-"), transform(n.children[0])], meta);
    case "UNARY_PLUS":
      return tree.cons("Op", [tree.string("+"), transform(n.children[0])], meta);
    case "++":
      return tree.cons("Op", [tree.string("++"), transform(n.children[0])], meta);
    case "--":
      return tree.cons("Op", [tree.string("--"), transform(n.children[0])], meta);
    case "!":
      return tree.cons("Op", [tree.string("!"), transform(n.children[0])], meta);
    case "REGEXP":
      return tree.cons("RegExp", [tree.string(n.value.toString())], meta);
    default:
      console.log("Not yet supported: ", n, tokens[n.type]);
  }
};

});
