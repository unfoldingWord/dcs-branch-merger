This demo is a test of updating the master branch from the user branch

Supply values for `server`, `owner`, `repo`, `userBranch` and `tokenid` or use the defaults.

Set `inputsReady = true` when you are ready to check.

App should do the call of checking if master should be merged into user branch first: `checkMergeUserIntoDefaultBranch()` (See [Check Merge User Branch into Default Branch](#/Check%20Merge%20of%20User%20Branch%20into%20Default%20Branch) Demo)

```js
import {useState, useEffect} from 'react';
import { mergeUserIntoDefaultBranch } from './mergeUserIntoDefaultBranch.js';

function Component() {
  const server = "https://qa.door43.org"
  const owner = "dcs-poc-org"
  // Can use: en_tn, en_tn_main_branch
  const repo = "en_tn"
  /* Can use: branch-is-same, branch-behind, 
      branch-ahead, branch-behind-and-ahead, 
      branch-conflicts
  */
  const userBranch = "branch-ahead"
  const tokenid = "c8b93b7ccf7018eee9fec586733a532c5f858cdd" // for single org use of the dcs-poc user
  const inputsReady = false // set to true when settings above are ready

  const [results, setResults] = useState(null)
  const prDescription = `This is a multiline
  description for the PR.
  server = ${server}
  owner = ${owner}
  repo = ${repo}
  branch = ${userBranch}
  `

  useEffect( () => {
    const doMerge = async () => {
      const _results = await mergeUserIntoDefaultBranch(
        {server, owner, repo, userBranch, prDescription, tokenid}
      );
      setResults(_results)
    }

    if ( (server !== "") 
      && (owner !== "") 
      && (repo !== "") 
      && (userBranch !== "" )
      && (tokenid !== "")
      && inputsReady) 
    {
      console.log("All inputs ready")
      doMerge()
    }
  }, [server, owner, repo, userBranch, tokenid, inputsReady])

  return (results?<pre>{JSON.stringify(results,null,4)}</pre>:<>Enter settings and set `inputsReady = true`</>)
}
;

<Component />
```
