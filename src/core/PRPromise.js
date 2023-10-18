/**
@module
@description This module defines an API for performing API requests that depend on
gitea request info such as the server, apiPath, owner, repo, etc.

@see {@link PRPromise}
*/
import { apiPath } from "./constants"

/**
@typedef {<R,A>(r : R) => Promise<A>} PRPromise<R,A>

The PRPromise API encapsulates expressions that can make API requests
to gitea and provides ways to combine theses expressions.

All gitea requests require some kind of readonly config (server,
repo, owner, etc) that is "prop drilled". This API does the
"prop-drilling" for us so users don't have to pass variables around
- including within async code.

# Origins Of PRPromise

Consider the following functions and their types defined in `common.js`:

```
//{server, owner, repo, prId} -> Promise<A>
export const getPrJson = ({server, owner, repo, prId}) => {... }

//{server, tokenid} -> Promise<B>
export async function getUserJson({ server, tokenid }) { ... }

//{server, tokenid} -> Promise<C>
export async function getUsername({ server, tokenid }) { ... }

//{server, owner, repo, prJson : {base : { sha : string}, merge_base : string}, filename : string} -> Promise<D>
export const checkFilenameUpdateable = ({ server, owner, repo, prJson: {base: {sha: base}, merge_base}, filename }) => ... 
```
Notice that each of these function's follow the same pattern in their types:

```
//{server, owner, repo, prId} -> Promise<A>
//{server, tokenid} -> Promise<B>
//{server, tokenid} -> Promise<B>
//{server, owner, repo, prJson : {base : { sha : string}, merge_base : string}, filename : string} -> Promise<D>
```
which is `r -> Promise<A>` where `r` is some readonly data and `A`
is the type of some return value (such as a JSON object).

# The Definition Of PRPromise

The PRPromise<R,A> type encapsulates these types to handle the
passing around of the config data, modifying the config data, and
how to combine/modify the promises returned by these functions.

//R is the type of the readonly config (R for "readonly") 
//A is the type of data produced by PRPromise computations
type PRPromise<R,A> = (r : R) => Promise<A>

for example, a value of type 

```
PRPromise<{server : string, repo : string}, IssueNumber>
``` 
is an expression that has `{server : string, repo : string}` as
readonly data and produces, asynchronously, an `IssueNumber`.

NOTE: Any function that has the type `r -> Promise<A>` _is_ a
PRPromise<R,A> regardless of the syntax used to define that function.
This includes:

```
const function foo = (r : R) => ...
function foo(r : R) { ... }
async function foo(r : R) { ... } 
```

# Expanding A PRPromise Expression

The power of the PRPromise API can be seen in the following example.
Below defines a function who's purpose is to get a PR by an ID, if
that fails then get the PR by incrementing that ID, if both fail
then produce a null value.

Using this API we could write:

```
getPROrNextPR = (prId) =>
  or
  ( repoGetJSON(`/pulls/${prId}`)
  , or(repoGetJSON(`/pulls/${prId+1}`), pure(null))
  )
```
If we substitute the definitions for `or`, `repoGetJSON`, and `pure`
and simplify the code a bit we arrive at (we leave the substitution
as an exercise to the reader):

```
getPROrNextPR = ({server, apiPath, owner, repo, prId}) =>
  fetch(`${server}/${apiPath}/repos/${owner}/${repo}/pulls/${prId}`)
  .then(r => r.json())
  .catch(_ => fetch(`${server}/${apiPath}/repos/${owner}/${repo}/pulls/${prId+1}`)
    .then(r => r.json())
    .catch(_ => null)
  )
```
The difference is one reads closer to the intention of the program
and the other reads closer to the "under-the-hood" definition of
the program.

*/

/**
@function
@description Map over the result of a PRPromise
@param {<A>(a : A) => B} fn
@param {pr : PRPromise<R,A>)} pr
@returns {PRPromise<R, B>}
*/
export const map = (fn, pr) => r => pr(r).then(a => fn(a))

/**
@function
@description Create a PRPromsise from a value
@param {A} a
@returns {PRPromise<R,A>}
*/
export const pure = (a) => (_) => Promise.resolve(a)

/**
@function
@description Like Promise.then but for PRPromise. NOTE: this function
allows for multiple then functions to be used that are then chained
together. For example:

```
then(x, f, g) <==> then(x, y => then(f(y), g)) <==> then(x, chain(f,g))
```
@param {pr : PRPromise<R,A>} pr 
@param {Array<<B,C>(b : B) => PRPromise<R,C>>} fns An array of functions that are composed together. 
@returns {PRPromise<R,C>}
*/
export const then = (pr, ...fns) => r => 
  fns.reduce((accPr, f) => accPr.then(b => f(b)(r)), pr(r))

/**
@function
@description Create a PRPromise that fails for no reason (internally
calls `Promise.reject()`)
@returns {PRPromise<R,A>}
*/
export const empty = () => Promise.reject()

/**
@function
@description Combine 2 PRPromises with or-like logic. If the first one fails then use the results of the second one.
@param {PRPromise<R,A>} pr1
@param {PRPromise<R,A>} pr2
@returns {PRPromise<R,A>}
*/
export const or = (pr1, pr2) => (r) =>
  pr1(r).catch(() => pr2(r))

/**
@function
@description Compose two functions that return PRPromises together.
This is function composition but for functions that return a PRPromise.

Consider normal function composition:
```
  h = (x) => g(f(x))
|---------|
| f    g  V
a -> b -> c
```
where `h` is the composition of `f` and `g`.

Now consider how to define `h` if we make `f` and `g` return their
values wrapped in a PRPromise. That is `a -> b` becomes 
`a -> PRPromise<b>` (or, short-handedly, `a ~> b`).

```
  h = chain(f, g)
|~~~~~~~~~|
| f    g  V
a ~> b ~> c
```
Here our composition includes handling the values wrapped in
PRPromises. This is what `chain` does. 

NOTE: You can accomplish the same thing using `a => then(f(a), g)`

@param {<R,A,B>(a : A) => PRPromise<R,B>} f
@param {<R,B,C>(b : B) => PRPromise<R,C>} g
*/
export const chain = (f,g) => (a) => then(f(a), g)

/**
@function
@description Iterates over the given array. NOTE: If there are no elements in the list, then return empty PRPromise
@param {<R,A,B>(a : A) => PRPromise<R,B | null>} f
@param {Array<A>} xs
@returns {PRPromise<R,B>} the first PRPromise that produces a non-null value
*/
export const forEveryFirst = (f, xs) => { 
  const rejectOnNull = (a) => a === null ? empty : pure(a)

  return xs.reduce
  ( (p, x) => or(p, then(f(x), rejectOnNull))
  , empty
  )
}

/**
@function
@description When the given predicate on the readonly config returns
true produce the given value
@param {<R>(r : R) => boolean} f
@param {A} a
@returns {PRPromise<R,A>}
*/
export const when = (f, a) => (r) => 
  f(r) ? pure(a)(r) : empty(r)

/**
@function
@description Extend the readonly (assuming it's an object) with another object.

For example 

```
getPrById : PRPromise<{prId : number, server : string}, object> = ({prId, server}) =>

getPrById2 : PRPRomise<{server : string}, object>
  = extendConfig({prId : 2}, getPrById)` 
  = (r) => getPrById({...r, prId: 2})
```
NOTE: 
  - the 2 definitions for `getPrById2` are identical:
  - the `R` type in `getPRById2` lacks the `prId` key that `getPrById`
  has as this value is hardcoded.


@param {Object} c object to extend the PRPromise config with
@param {PRPromise<Object,A>} p
@returns {PRPromise<Object,A>}
*/
export const extendConfig = (c, p) => (r) => p({...r, ...c})

/**
@typedef {string} URLPath
The path for an HTTP url. NOTE: _do not include a forward slash
prefix, e.g '/foo/bar' should be 'foo/bar')
@example 'foo/bar/baz'

*/

/**
@typedef {string} HTTPUrl
An HTTP Url. 
@example 'https://www.foobar.com/baz'
*/

/**
@typedef {string} Owner
The owner of a repository. 
@example 'unfoldingWord'
*/

/**
@typedef {string} RepoName
The name of a repository
@example 'en_tn'
*/

/**
@typedef {object} RepoInfo
@property {HTTPUrl} server
@property {Owner} owner
@property {RepoName} repo
*/

/**
@function
@description GET JSON from the repository for the given path. The
URL used to make the request is:

```
${server}/${apiPath}/repos/${owner}/${repo}/${path}`. 
```
Where `apiPath` is defined in {@link ./constants.js}

@param {URLPath} path
@returns {PRPromise<RepoInfo, JSON>}
@see {@link apiPath}
@todo consider using a proper URL library
*/
export const repoGetJSON = (path) => ({server, owner, repo}) => 
  fetch(`${server}/${apiPath}/repos/${owner}/${repo}/${path}`)
  .then(r => r.json())

