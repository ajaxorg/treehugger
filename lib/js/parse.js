define(function(require, exports, module) {

var parser = require("ace/narcissus/jsparse"),
    tokens = require("ace/narcissus/jsdefs").tokens,
    ast = require('ast');

exports.parse = function(s) {
  try {
    var n = parser.parse(s);
    return exports.transform(n);
  } catch(e) {
    return ast.string("Invalid Javascript: " + e.toString());
  }
};

exports.transform = function(n) {
  if(!n) {
    return ast.cons("None", []);
  }
  var meta = {line: n.lineno, pos: n.start},
      transform = exports.transform;
  switch(tokens[n.type]) {
    case "SCRIPT":
      return ast.cons("Block", [ast.list(n.children.map(transform))], meta);
    case "BLOCK":
      return ast.cons("Block", [ast.list(n.children.map(transform))], meta);
    case "OBJECT_INIT":
      return ast.cons("ObjectInit", [ast.list(n.children.map(transform))], meta);
    case "PROPERTY_INIT":
      return ast.cons("PropertyInit", [ast.string(n.children[0].value), transform(n.children[1])], meta);
    case "ARRAY_INIT":
      return ast.cons("ArrayInit", [ast.list(n.children.map(transform))], meta);
    case "try":
      return ast.cons("Try", [transform(n.tryBlock), ast.list(n.catchClauses.map(transform))], meta);
    case "catch":
      return ast.cons("Catch", [ast.string(n.varName), transform(n.block)], meta);
    case "function":
      return ast.cons("Function", [n.name ? ast.string(n.name) : ast.string(""), ast.list(n.params.map(function(a) {
                return ast.string(a); 
              })), transform(n.body)], meta);
    case "switch":
      return ast.cons("Switch", [transform(n.discriminant), ast.list(n.cases.map(transform))], meta);
    case "case":
      return ast.cons("Case", [transform(n.caseLabel), ast.list(n.statements.children.map(transform))], meta);
    case ",":
      return ast.cons("Comma", [ast.list(n.children.map(transform))], meta);
    case "break":
      return ast.cons("Break", [], meta);
    case "default":
      return ast.cons("DefaultCase", [ast.list(n.statements.children.map(transform))], meta);
    case "var":
      return ast.cons("VarDecls", [ast.list(n.children.map(function(vardec) {
        if(vardec.initializer) {
          return ast.cons("VarDeclInit", [ast.string(vardec.name), transform(vardec.initializer)], meta);
        } else {
          return ast.cons("VarDecl", [ast.string(vardec.name)], meta);
        }
      }))], meta);
    case "const":
      return ast.cons("ConstDecls", [ast.list(n.children.map(function(vardec) {
        return ast.cons("ConstDeclInit", [ast.string(vardec.name), transform(vardec.initializer)], meta);
      }))], meta);
    case "return":
      return ast.cons("Return", [transform(n.value)], meta);
    case "LABEL":
      return ast.cons("Label", [ast.string(n.label), transform(n.statement)], meta);
    case "GETTER":
      return ast.cons("Getter", [ast.string(n.name), transform(n.body)], meta);
    case "throw":
      return ast.cons("Throw", [transform(n.exception)], meta);
    case "in":
      return ast.cons("In", [transform(n.children[0]), transform(n.children[1])], meta);
    case "INDEX":
      return ast.cons("Index", [transform(n.children[0]), transform(n.children[1])], meta);
    case "?":
      return ast.cons("TernaryIf", [transform(n.children[0]), transform(n.children[1]), transform(n.children[2])], meta);
    case "this":
      return ast.cons("This", [], meta);
    case "=":
      return ast.cons("Assign", [transform(n.children[0]), transform(n.children[1])], meta);
    case "true":
      return ast.cons("True", [], meta);
    case "false":
      return ast.cons("True", [], meta);
    case "null":
      return ast.cons("Null", [], meta);
    case "continue":
      return ast.cons("Continue", [], meta);
    case "delete":
      return ast.cons("Delete", [transform(n.children[0])], meta);
    case "if":
      return ast.cons("If", [transform(n.condition), transform(n.thenPart), transform(n.elsePart)], meta);
    case "while":
      return ast.cons("While", [transform(n.condition), transform(n.body)], meta);
    case "do":
      return ast.cons("DoWhile", [transform(n.body), transform(n.condition)], meta);
    case "for":
      return ast.cons("For", [transform(n.setup), transform(n.condition), transform(n.update), transform(n.body)], meta);
    case "FOR_IN":
      return ast.cons("ForIn", [transform(n.iterator), transform(n.object), transform(n.body)], meta);
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
    case "typeof":
      return ast.cons("TypeOf", [transform(n.children[0])], meta);
    case "instanceof":
      return ast.cons("InstanceOf", [transform(n.children[0]), transform(n.children[1])], meta);
    case "!==":
      return ast.cons("Op", [ast.string("!=="), transform(n.children[0]), transform(n.children[1])], meta);
    case "===":
      return ast.cons("Op", [ast.string("==="), transform(n.children[0]), transform(n.children[1])], meta);
    case "!=":
      return ast.cons("Op", [ast.string("!="), transform(n.children[0]), transform(n.children[1])], meta);
    case "==":
      return ast.cons("Op", [ast.string("=="), transform(n.children[0]), transform(n.children[1])], meta);
    case "<":
      return ast.cons("Op", [ast.string("<"), transform(n.children[0]), transform(n.children[1])], meta);
    case "<=":
      return ast.cons("Op", [ast.string("<="), transform(n.children[0]), transform(n.children[1])], meta);
    case ">":
      return ast.cons("Op", [ast.string(">"), transform(n.children[0]), transform(n.children[1])], meta);
    case ">=":
      return ast.cons("Op", [ast.string(">="), transform(n.children[0]), transform(n.children[1])], meta);
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
    case "|":
      return ast.cons("Op", [ast.string("|"), transform(n.children[0]), transform(n.children[1])], meta);
    case "&":
      return ast.cons("Op", [ast.string("&"), transform(n.children[0]), transform(n.children[1])], meta);
    case "%":
      return ast.cons("Op", [ast.string("%"), transform(n.children[0]), transform(n.children[1])], meta);
    case "UNARY_MINUS":
      return ast.cons("Op", [ast.string("-"), transform(n.children[0])], meta);
    case "UNARY_PLUS":
      return ast.cons("Op", [ast.string("+"), transform(n.children[0])], meta);
    case "++":
      return ast.cons("Op", [ast.string("++"), transform(n.children[0])], meta);
    case "--":
      return ast.cons("Op", [ast.string("--"), transform(n.children[0])], meta);
    case "!":
      return ast.cons("Op", [ast.string("!"), transform(n.children[0])], meta);
    case "REGEXP":
      return ast.cons("RegExp", [ast.string(n.value.toString())], meta);
    default:
      console.log("Not yet supported: ", n, tokens[n.type]);
  }
};

});
