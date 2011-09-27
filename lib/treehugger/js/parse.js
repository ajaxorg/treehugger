define(function(require, exports, module) {

var parser = require("treehugger/uglifyparser");
var tree = require('treehugger/tree');

exports.parse = function(s) {
    var n = parser.parse(s, false, true);
    return exports.transform(n);
};

exports.transform = function(n) {
    if (!n) {
        return tree.cons("None", []);
    }
    var transform = exports.transform; 
    var nodeName = typeof n[0] === 'string' ? n[0] : n[0].name;
    
    var resultNode;
    
    switch(nodeName) {
        case "toplevel":
            resultNode = tree.list(n[1].map(transform));
            break;
        case "var":
            resultNode = tree.cons("VarDecls", [tree.list(n[1].map(function(varNode) {
                if(varNode[1])
                    return tree.cons("VarDeclInit", [tree.string(varNode[0]), transform(varNode[1])]);
                else
                    return tree.cons("VarDecl", [tree.string(varNode[0])]);
            }))]);
            break;
        case "const":
            resultNode = tree.cons("ConstDecls", [tree.list(n[1].map(function(varNode) {
                return tree.cons("ConstDeclInit", [tree.string(varNode[0]), transform(varNode[1])]);
            }))]);
            break;
        case "num":
            resultNode = tree.cons("Num", [tree.string(n[1])]);
            break;
        case "string":
            resultNode = tree.cons("String", [tree.string(n[1])]);
            break;
        case "stat":
            resultNode = transform(n[1]);
            break;
        case "call":
            resultNode = tree.cons("Call", [transform(n[1]), tree.list(n[2].map(transform))]);
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
        case "assign":
            // TODO: do something with n[1]
            resultNode = tree.cons("Assign", [transform(n[2]), transform(n[3])]);
            break;
        case "dot":
            resultNode = tree.cons("PropAccess", [transform(n[1]), tree.string(n[2])]);
            break;
        case "name":
            resultNode = tree.cons("Var", [tree.string(n[1])]);
            break;
        case "defun":
            resultNode = tree.cons("Function", [tree.string(n[1]), tree.list(n[2].map(function(arg) {
                    return tree.string(arg);
            })), tree.list(n[3].map(transform))]);
            break;
        case "function":
            resultNode = tree.cons("Function", [tree.string(n[1]), tree.list(n[2].map(function(arg) {
                    return tree.string(arg);
            })), tree.list(n[3].map(transform))]);
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
        case "for":
            resultNode = tree.cons("For", [transform(n[1]), transform(n[2]), transform(n[3]), transform(n[4])]);
            break;
        case "for-in":
            resultNode = tree.cons("For", [transform(n[1]), transform(n[3]), transform(n[4])]);
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
            resultNode = tree.cons("RegExp", [tree.string(n[1]), tree.string(n[2])]);
            break;
        case "throw":
            resultNode = tree.cons("Throw", [transform(n[1])]);
            break;
        case "try":
            resultNode = tree.cons("Try", [tree.list(n[1].map(transform)),
                 tree.list(n[2] ? [tree.cons("Catch", [tree.string(n[2][0]), tree.list(n[2][1].map(transform))])] : []),
                 n[3] ? tree.list(n[3].map(transform)) : tree.cons("None", [])]);
            break;
        default:
            console.log("Not yet supported: ", nodeName);
            console.log("Current node: ", n);
    }

    resultNode.setAnnotation("origin", n);
    if(n[0].start) {
        resultNode.setAnnotation("pos", {sl: n[0].start.line, sc: n[0].start.col,
                                         el: n[0].end.line,   ec: n[0].end.col});
    }
    return resultNode;
};

});
