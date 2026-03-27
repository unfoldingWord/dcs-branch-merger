import { getPrJsonWithNonCheckingStatus } from './pullRequestMergeableHack'

export async function checkMergeUserIntoDefaultBranch({
  server, owner, repo, userBranch, prDescription, tokenid, userId
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
    prJson = await getPrJsonWithNonCheckingStatus( {server, owner, repo, userBranch, prBody: prDescription, tokenid, userId} )
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
  returnObject.mergeNeeded = mergeable && (headSha !== baseSha && headSha !== mergeBase)
  returnObject.pullRequest = pullRequest
  console.log(mergeable, headSha, baseSha, mergeBase, returnObject.mergeNeeded)
  return returnObject
}
