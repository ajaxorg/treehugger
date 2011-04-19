treehugger.js
=============

`treehugger.js` is a Javascript library for programming language processing. It
has generic means to represent and manipulate (analyze, transform)
abstract syntax trees (ASTs). It currently consists of two parts:

* A generic ASTs representation format, inspired by [ATerms](http://www.meta-environment.org/Meta-Environment/ATerms))
* A set of generic traversals to query, manipulate and annotate ASTs, inspired by [Stratego/XT](http://strategoxt.org)

as a bonus and to get your started it also includes a JavaScript _parser_ (based on Narcissus) that turns
Javascript code into an AST in `lib/js/parse.js`.

The project relies on [require.js](http://requirejs.org) for library loading.

AST Representation
------------------

ast.js uses a few  data structures to represent ASTs and a textual representation
that makes it easy to debug your ASTs and AST analyses. The textual representation
is best introduced by example.

Consider a simple expresion language with expression as follows:

    2 + 3 * 1

A parser could turn this into the following AST:

       Add
      /   \
    Num   Mul
     |   /   \
     2  Num  Num
         |    |
         3    1

Which is expressed using treehugger.js's textual representation as follows:

    Add(Num("2"), Mul(Num("3"), Num("1")))

Using the `treehugger.js` API this AST can be contructed as follows:

    var tree = require('treehugger/tree');
    var node = tree.cons("Add", [tree.cons("Num", [tree.string("2")]),
                                 tree.cons("Mul", [tree.cons("Num", [tree.string("3")]),
                                                   tree.cons("Num", [tree.string("1")])])]);

Or, more simply:

    var node = tree.parse('Add(Num("2"), Mul(Num("3"), Num("1")))');

treehugger.js has three kinds of AST node types:

* Strings (e.g. `"2"`, `"myVariable"`), usually representing identifiers or other
  textual values.
* Lists (e.g. `["a", "b", None()]`)
* Constructors (or simply: cons nodes) (e.g. `None()` or `Num("2")`), used to represent
  language constructs in the language, such as operators, loop constructs, etc.


Traversing the AST
------------------

The transform library adds a number of methods to AST nodes that make traversals simpler:

* `collectTopDown` (traverses the tree top to bottom until finding a match, collecting all matches and returning them as a list)
* `traverseTopDown` (traverses the tree top to bottom until finding a match)

Each of these takes a arbitrary number of arguments representing _transformations_. A transformation can be either:

* A textual AST pattern
* A textual AST pattern and a transformation function that is passed a binding object
* A transformation function

Each of these either _match_ or _don't_ match. If a transformation function matches,
it returns a non-falsy value (usually the AST node itself), if it doesn't, it returns `false`.
A simple example:

    var node = tree.parse('Add(Num("2"), Mul(Num("3"), Num("1")))');
    node.collectTopDown("Num(_)").debug();

This will traverse the AST and look for nodes that match the Num(_) pattern,
where _ (a wildcard) can be anything. The result of the `collect` call in this case will be:

    [Num("2"), Num("3"), Num("1")]

The `.debug()` call prints the result to the Javascript console (`console.log`).

So, what if we want to only return the numbers, not the `Num(...)` constructors?
If we follow a textual pattern by a function, we can transform the result:

    var node = tree.parse('Add(Num("2"), Mul(Num("3"), Num("1")))');
    node.collectTopDown("Num(n)", function(b) { return b.n; }).debug();

Instead of using the placeholder `_`, we now used `n`. The function is passed a
_bindings_ object whose `n` property will contain the value of the placeholder.
So, the following will be printed to the Javascript console:

    ["2", "3", "1"]

If we want to match _either_ `Num` or `Mul` nodes we can add a pattern for that
to the `collect` call:

    var node = tree.parse('Add(Num("2"), Mul(Num("3"), Num("1")))');
    node.collectTopDown(
      "Num(n)", function(b) {
          return b.n;
        },
      "Mul(op1, op2)", function(b) {
         return b.op1;
      }
    ).debug();

This will print:

    ["2", Num("3")]

Why is that? The AST is traversed top to bottom by `collect`. On its way, it will
try to match every node first against the `Num(n)` pattern. If that succeeds,
the function after it in the argument list is executed, if the function returns
a value other than `false`, the traversal stops at that branch and the result
is added to the result list. If the `"Num(n)"` pattern did _not_ match, it is
matched against `"Mul(op1, op2)"`. Again, if this pattern matches, the function
is executed etc. etc. The `collectTopDown` traversal will not traverse down to the
`Num("3")` and `Num("1")` nodes, because the traversal stopped when matching the
`Mul(..., ...)` node -- if, instead the tranformation function would have returned
`false, the traversal would have proceeded down those nodes as well.

Demo
----

You can see [treehugger.js in action in this simple demo](http://c9.io/zef/treehugger/workspace/test.html).