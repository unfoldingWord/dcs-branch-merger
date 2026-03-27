import { checkFilenameUpdateable } from './common'
import { getPrJsonWithNonCheckingStatus } from './pullRequestMergeableHack'

export async function checkMergeDefaultIntoUserBranch({
  server, owner, repo, userBranch, prDescription, tokenid, filename, userId
}) {
  // console.log(server, owner, repo, userBranch, userId)
  let returnObject = {
    mergeNeeded: false,
    conflict: false, 
    error: false,
    message: "",
    pullRequest: "",
  };
  let prJson = {}
  try {
    prJson = await getPrJsonWithNonCheckingStatus ( {server, owner, repo, userBranch, prBody: prDescription, tokenid, userId} )
  } catch (e) {
    returnObject.error = true
    returnObject.message = e.message
    return returnObject
  }
  console.log("prJson:", prJson)
  const mergeable = prJson.mergeable
  const headSha = prJson.head.sha
  const baseSha = prJson.base.sha
  const mergeBase = prJson.merge_base
  const pullRequest = prJson.url
  returnObject.conflict = ! mergeable
  returnObject.mergeNeeded = mergeable && (headSha !== baseSha && baseSha !== mergeBase)
  returnObject.pullRequest = pullRequest
  if ( mergeable && filename ) {
    // narrow the context for mergeability to this single file, ignoring any others
    // Do note: the boolean for mergeable is in terms of the entire branch.
    // Therefore while the conflict may exist in a different file, out of an abundance
    // of caution we will not test for the provided file when conflicts exist anywhere
    returnObject.mergeNeeded = await checkFilenameUpdateable({server, owner, repo, prJson, filename})
  }
  console.log(mergeable, headSha, baseSha, mergeBase, returnObject.mergeNeeded)
  return returnObject
}
