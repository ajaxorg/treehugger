define(function(require, exports, module) {

var parser = require("treehugger/js/acorn_loose");
var tree = require('treehugger/tree');

exports.parse = function(s) {
    var result = parser.parse_dammit(s, {locations: true});
    var node = exports.transform(result);
    if(result.error)
        node.setAnnotation("error", result.error);
    return node;
};


function setIdPos(n, resultNode) {
    if(n.loc) {        
        resultNode.setAnnotation("pos", {
            sl: n.loc.start.line, sc: n.loc.start.column,
            el: n.loc.end.line, ec: n.loc.end.column
        }); 
    }
    return resultNode;
}
exports.transform = function transform(n) {
    if (!n) {
        return tree.cons("None", []);
    }
    var nodeName = n.type;
    
    var resultNode;
    
    switch(nodeName) {
        case "Program":
            resultNode = tree.list(n.body.map(transform));
            break;
        case "VariableDeclaration":
            if (n.kind === "var") {
                var VarDecls = "VarDecls", VarDeclInit = "VarDeclInit", VarDecl = "VarDecl";
            } else if (n.kind === "let") {
                var VarDecls = "LetDecls", VarDeclInit = "LetDeclInit", VarDecl = "LetDecl";
            } else if (n.kind === "const") {
                var VarDecls = "ConstDecls", VarDeclInit = "ConstDeclInit", VarDecl = "ConstDecl";
            }
            resultNode = tree.cons(VarDecls, [tree.list(n.declarations.map(function(varNode) {
                var idNode = tree.string(varNode.id.name);
                setIdPos(varNode.id, idNode);
                if(varNode.init)
                    return tree.cons(VarDeclInit, [idNode, transform(varNode.init)]);
                else
                    return tree.cons(VarDecl, [idNode]);
            }))]);
            break;
        case "num":
            resultNode = tree.cons("Num", [tree.string(n.raw)]);
            break;
        case "string":
            resultNode = tree.cons("String", [tree.string(n.value)]);
            break;
        case "ExpressionStatement":
            return transform(n.expression);
        case "CallExpression":
            resultNode = tree.cons("Call", [transform(n.callee), tree.list(n.arguments.map(transform))]);
            break;
        case "ReturnStatement":
            resultNode = tree.cons("Return", [transform(n.argument)]);
            break;
        case "NewExpression":
            resultNode = tree.cons("New", [transform(n.callee), tree.list(n.arguments.map(transform))]);
            break;
        case "ObjectExpression":
            resultNode = tree.cons("ObjectInit", [tree.list(n.properties.map(function(propInit) {
                var key = propInit.key;
                return tree.cons("PropertyInit", [tree.string(key.name || key.value || ""), transform(propInit.value)]);
            }))]);
            break;
        case "ArrayExpression":
            resultNode = tree.cons("Array", [tree.list(n.elements.map(transform))]);
            break;
        case "ConditionalExpression":
            resultNode = tree.cons("TernaryIf", [transform(n.test), transform(n.consequent), transform(n.alternate)]);
            break;
        case "LabeledStatement":
            resultNode = tree.cons("Label", [tree.string(n.label.name), transform(n.body)]);
            break;
        case "AssignmentExpression":
            if(n.operator != "=") {
                resultNode = tree.cons("OpAssign", [tree.string(n.operator[0]), transform(n.left), transform(n.right)]);
            } else {
                resultNode = tree.cons("Assign", [transform(n.left), transform(n.right)]);
            }
            break;
        case "MemberExpression":
            resultNode = n.computed
                ? tree.cons("Index", [transform(n.object), transform(n.property)])
                : tree.cons("PropAccess", [transform(n.object), tree.string(n.property.name || "")]);
            break;
        case "Identifier":
            resultNode = tree.cons("Var", [tree.string(n.name)]);
            break;
        case "ThisExpression":
            resultNode = tree.cons("Var", [tree.string("this")]);
            break;
        case "FunctionDeclaration":
            // todo this doesn't handle error in id.name, but old parser doen't handle it as well
            resultNode = tree.cons("Function", [setIdPos(n.id, tree.string(n.id.name || "")), tree.list(n.params.map(function(arg) {
                return setIdPos(arg, tree.cons("FArg", [tree.string(arg.name)]));
            })), tree.list(n.body.body.map(transform))]);
            break;
        case "FunctionExpression":
            var funName = tree.string(n.id || "");            
            var fargs = tree.list(n.params.map(function(arg) {
                return setIdPos(arg, tree.cons("FArg", [tree.string(arg.name)]));
            }));
            resultNode = tree.cons("Function", [funName, fargs, tree.list(n.body.body.map(transform))]);
            break;
        case "LogicalExpression":
        case "BinaryExpression":
            resultNode = tree.cons("Op", [tree.string(n.operator), transform(n.left), transform(n.right)]);
            break;
        case "UpdateExpression":
        case "UnaryExpression":
            resultNode = tree.cons(n.prefix ? "PrefixOp" : "PostfixOp", [tree.string(n.operator), transform(n.argument)]);
            break;
        case "sub":
            resultNode = tree.cons("Index", [transform(n[1]), transform(n[2])]);
            break;
        case "ForStatement":
            resultNode = tree.cons("For", [transform(n.init), transform(n.test), transform(n.update), transform(n.body)]);
            break;
        case "ForInStatement":
            resultNode = tree.cons("ForIn", [transform(n.left), transform(n.right), transform(n.body)]);
            break;
        case "WhileStatement":
            resultNode = tree.cons("While", [transform(n.test), transform(n.body)]);
            break;
        case "DoWhileStatement": 
            resultNode = tree.cons("Do", [transform(n.body), transform(n.test)]);
            break;
        case "SwitchStatement":
            resultNode = tree.cons("Switch", [transform(n.discriminant), tree.list(n.cases.map(function(opt) {
                return tree.cons("Case", [transform(opt.test), tree.list(opt.consequent.map(transform))]);
            }))]);
            break;
        case "ContinueStatement":
            resultNode = tree.cons("Continue", [tree.string(n.label ? n.label.name : "")]);
            break;
        case "BreakStatement":
            resultNode = tree.cons("Break", [tree.string(n.label ? n.label.name : "")]);
            break;
        case "SequenceExpression":  // todo can we get rid of nesting?
            resultNode = n.expressions.reduceRight(function(a, b) {                
                return a ? tree.cons("Seq", [transform(b), a]) : transform(b);
            }, "");
            break;
        case "IfStatement":
            resultNode = tree.cons("If", [transform(n.test), transform(n.consequent), transform(n.alternate)]);
            break;
        case "EmptyStatement":
        case "BlockStatement":
            resultNode = tree.cons("Block", [tree.list(n.body ? n.body.map(transform) : [])]);
            break;
        case "regexp":
            var val = n.raw, i = val.lastIndexOf("/");
            resultNode = tree.cons("RegExp", [tree.string(val.slice(1, i)), tree.string(val.substr(i + 1))]);
            break;
        case "ThrowStatement":
            resultNode = tree.cons("Throw", [transform(n.argument)]);
            break;
        case "TryStatement":
            resultNode = tree.cons("Try", [tree.list(n.block.body.map(transform)),
                tree.list(n.handler ? [tree.cons("Catch", [
                    tree.string(n.handler.param.name || ""), tree.list(n.handler.body.body.map(transform))
                ])] : []),
                n.finalizer ? tree.list(n.finalizer.body.map(transform)) : tree.cons("None", [])
            ]);
            break;
        case "WithStatement":
            resultNode = tree.cons("With", [transform(n.object), tree.list((n.body.body||[]).map(transform))]);
            break;
        case "Literal":
            // old parser never returned atom
            // resultNode = tree.cons("Atom", []);
            resultNode = tree.cons("Var", [tree.string(n.value + "")]);
            break;
        case "ERROR":
            resultNode = tree.cons("ERROR", []);
            break;
        default:
            console.log("Not yet supported: "+ nodeName);
            console.log("Current node: "+ JSON.stringify(n));
            resultNode = tree.cons(tree.string(nodeName), [tree.string(JSON.stringify(n, function(key, val) {
                if (key !== "loc") 
                    return val;
            }, 4))]);
    }

    resultNode.setAnnotation("origin", n);
    if(n.loc) {
        resultNode.setAnnotation("pos", {
            sl: n.loc.start.line, sc: n.loc.start.column,
            el: n.loc.end.line, ec: n.loc.end.column
        }); 
    }
    return resultNode;
};
});
