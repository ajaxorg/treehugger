define(function(require, exports, module) {

var parser = require("treehugger/js/uglifyparser");
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
            resultNode = tree.cons("VarDecls", [tree.list(n.declarations.map(function(varNode) {
                var idNode = tree.string(varNode.id.name);
                setIdPos(varNode.id, idNode);
                if(varNode.init)
                    return tree.cons("VarDeclInit", [idNode, transform(varNode.init)]);
                else
                    return tree.cons("VarDecl", [idNode]);
            }))]);
            break;
        case "let":
            resultNode = tree.cons("LetDecls", [tree.list(n[1].map(function(varNode) {
                var idNode = tree.string(varNode[0].name);
                setIdPos(varNode[0], idNode);
                if(varNode[1])
                    return tree.cons("LetDeclInit", [idNode, transform(varNode[1])]);
                else
                    return tree.cons("LetDecl", [idNode]);
            }))]);
            break;
        case "const":
            resultNode = tree.cons("ConstDecls", [tree.list(n[1].map(function(varNode) {
                var idNode = tree.string(varNode[0].name);
                setIdPos(varNode[0], idNode);
                if(varNode[1])
                    return tree.cons("ConstDeclInit", [idNode, transform(varNode[1])]);
                else
                    return tree.cons("ConstDecl", [idNode]);
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
                return tree.cons("PropertyInit", [tree.string(propInit.key.name), transform(propInit.value)]);
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
        case "continue":
            resultNode = tree.cons("Continue", [tree.string(n[1])]);
            break;
        case "AssignmentExpression":
            if(n.operator != "=") {
                resultNode = tree.cons("OpAssign", [tree.string(n.operator[0]), transform(n.left), transform(n.right)]);
            } else {
                resultNode = tree.cons("Assign", [transform(n.left), transform(n.right)]);
            }
            break;
        case "MemberExpression":
            resultNode = tree.cons("PropAccess", [transform(n.object), tree.string(n.property.name)]);
            break;
        case "Identifier":
            if (n.name == "\u2716") { // todo change acorn to create error node instead
                resultNode = tree.cons("ERROR", []);
                break;
            }
            resultNode = tree.cons("Var", [tree.string(n.name)]);
            break;
        case "FunctionDeclaration":
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
        case "break":
            resultNode = tree.cons("Break", []);
            break;
        case "SequenceExpression":  // todo can we get rid of nesting?
            resultNode = n.expressions.reduceRight(function(a, b) {                
                return a ? tree.cons("Seq", [transform(b), a]) : transform(b);
            }, "");
            break;
        case "IfStatement":
            resultNode = tree.cons("If", [transform(n[1]), transform(n[2]), transform(n[3])]);
            break;
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
        case "atom": // todo?
            resultNode = tree.cons("Atom", []);
            break;
        case "ERROR":
        case "EmptyStatement":
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
