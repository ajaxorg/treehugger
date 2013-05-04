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
        case "return":
            resultNode = tree.cons("Return", [transform(n[1])]);
            break;
        case "new":
            resultNode = tree.cons("New", [transform(n[1]), tree.list(n[2].map(transform))]);
            break;
        case "object":
            resultNode = tree.cons("ObjectInit", [tree.list(n[1].map(function(propInit) {
                return tree.cons("PropertyInit", [tree.string(propInit[0]), transform(propInit[1])]);
            }))]);
            break;
        case "array":
            resultNode = tree.cons("Array", [tree.list(n[1].map(transform))]);
            break;
        case "conditional":
            resultNode = tree.cons("TernaryIf", [transform(n[1]), transform(n[2]), transform(n[3])]);
            break;
        case "label":
            resultNode = tree.cons("Label", [tree.string(n[1]), transform(n[2])]);
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
            resultNode = tree.cons("Var", [tree.string(n.name)]);
            break;
        case "defun":
            resultNode = tree.cons("Function", [setIdPos(n[1], tree.string(n[1].name || "")), tree.list(n[2].map(function(arg) {
                return setIdPos(arg, tree.cons("FArg", [tree.string(arg.name)]));
            })), tree.list(n[3].map(transform))]);
            break;
        case "function":
            var funName = tree.string(n[1].name || "");
            if(n[1].name)
                setIdPos(n[1], funName);
            var fargs = tree.list(n[2].map(function(arg) {
                return setIdPos(arg, tree.cons("FArg", [tree.string(arg.name)]));
            }));
            /*if(fargs.length > 0) {
                fargs.setAnnotation("pos", {
                    sl: fargs[0].getPos().sl,
                    sc: fargs[0].getPos().sl,
                    el: fargs[fargs.length - 1].getPos().el,
                    ec: fargs[fargs.length - 1].getPos().ec
                });
            }*/
            resultNode = tree.cons("Function", [funName, fargs, tree.list(n[3].map(transform))]);
            break;
        case "binary":
            resultNode = tree.cons("Op", [tree.string(n[1]), transform(n[2]), transform(n[3])]);
            break;
        case "unary-postfix":
            resultNode = tree.cons("PostfixOp", [tree.string(n[1]), transform(n[2])]);
            break;
        case "unary-prefix":
            resultNode = tree.cons("PrefixOp", [tree.string(n[1]), transform(n[2])]);
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
        case "while":
            resultNode = tree.cons("While", [transform(n[1]), transform(n[2])]);
            break;
        case "do": 
            resultNode = tree.cons("Do", [transform(n[2]), transform(n[1])]);
            break;
        case "switch":
            resultNode = tree.cons("Switch", [transform(n[1]), tree.list(n[2].map(function(opt) {
                return tree.cons("Case", [transform(opt[0]), tree.list(opt[1].map(transform))]);
            }))]);
            break;
        case "break":
            resultNode = tree.cons("Break", []);
            break;
        case "seq":
            resultNode = tree.cons("Seq", [transform(n[1]), transform(n[2])]);
            break;
        case "if":
            resultNode = tree.cons("If", [transform(n[1]), transform(n[2]), transform(n[3])]);
            break;
        case "block":
            resultNode = tree.cons("Block", [tree.list(n[1] ? n[1].map(transform) : [])]);
            break;
        case "regexp":
            var val = n.raw, i = val.lastIndexOf("/");
            resultNode = tree.cons("RegExp", [tree.string(val.slice(1, i)), tree.string(val.substr(i + 1))]);
            break;
        case "throw":
            resultNode = tree.cons("Throw", [transform(n[1])]);
            break;
        case "try":
            resultNode = tree.cons("Try", [tree.list(n[1].map(transform)),
                 tree.list(n[2] ? [tree.cons("Catch", [tree.string(n[2][0]), tree.list(n[2][1].map(transform))])] : []),
                 n[3] ? tree.list(n[3].map(transform)) : tree.cons("None", [])]);
            break;
        case "with":
            resultNode = tree.cons("With", [transform(n[1]), tree.list(n[2][1].map(transform))]);
            break;
        case "atom":
            resultNode = tree.cons("Atom", []);
            break;
        case "ERROR":
            resultNode = tree.cons("ERROR", []);
            break;
        default:
            console.log("Not yet supported: "+ nodeName);
            console.log("Current node: "+ JSON.stringify(n));
            resultNode = tree.cons(tree.string(nodeName), [tree.string(JSON.stringify(n, null, 4))]);
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
