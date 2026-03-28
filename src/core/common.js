import Path from 'path'
import { apiPath } from './constants'


// example: GET https://qa.door43.org/api/v1/repos/unfoldingword/en_ult/pulls/3358
export async function getPrJson({
  server, owner, repo, prId,
}) {
  // console.log("getPrJson()",server, owner, repo, prId)
  const uri = server + '/' + Path.join(apiPath, 'repos', owner, repo, 'pulls', prId)
  let res = {}
  try {
    res = await fetch(uri);
  } catch (e) {
    console.error("getPrJson() fetch failed", server, owner, repo, prId, e)
    return null
  }
  if (!res.ok) {
    console.error(`getPrJson() http error: ${res.status}`, server, owner, repo, prId)
  }
  return res.json()
}

// example: GET https://qa.door43.org/api/v1/user
export async function getUserJson({
  server, tokenid
}) {
  // console.log("getUserJson()",server, tokenid)
  const uri = server + '/' + Path.join(apiPath, 'user')
  let res = await fetch(uri, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenid}` },
  })
  // console.log("getUserJson res.Status: ", res.status)
  switch (res.status) {
    case 401:
      console.error(`getUserJson() http error: res.status=${res.status}`, server, tokenid)
      throw Error("invalid token")
    case 200:
      return await res.json()
    default:
      console.error(`getUserJson() http error: res.status=${res.status}`, server, tokenid)
      throw Error("unknown error")
  }
}

// gets the user name that goes with the tokenid
export async function getUsername({
  server, tokenid
}) {
  const userJson = await getUserJson({ server, tokenid })
  return userJson.login
}

// example: GET https://qa.door43.org/api/v1/repos/unfoldingWord/en_tn/pulls/master/user-tc-create-1
export async function getPrJsonByUserBranch2({
                                    server, owner, repo, userBranch, prBody, tokenid, userId
                                  }) {
  const uri = server + '/' + Path.join(apiPath, 'repos', owner, repo, 'pulls', 'master', userBranch)
  let res = {}
  try {
    res = await fetch(uri);
  } catch (e) {
    console.error(`getPrJsonByUserBranch2() fetch failed`, uri, e)
    return Error(`error fetching ${uri}`)
  }
  //TODO: add parsing of response
  switch (res.status) {
    case 404:
      console.error(`getPrJsonByUserBranch2() http error: res.status=${res.status}`, server, owner, repo)
      throw Error(`repository ${owner}/${repo} doesn't exist`)
    case 200:
      return await res.json();
    default:
      console.error(`getPrJsonByUserBranch2() http error: res.status=${res.status}`, server, owner, repo)
      throw Error('unknown error')
  }
}

// example: POST https://qa.door43.org/api/v1/repos/unfoldingword/en_ult/pulls
export async function getPrJsonByUserBranch({
  server, owner, repo, userBranch, prBody, tokenid, userId
}) {
  // We get a PR by UserBranch by first creating an open PR for the user branch into master.
  // Since only one open PR can exist, the request will return a 409 if it does with information 
  // we can use to get the existing PR, otherwise use the newly created PR.
  let username = userId
  if (!username) {
    username = await getUsername({ server, tokenid })
  }
  // console.log("username from getUsername() is:", username)
  const defaultBranch = await getRepoDefaultBranch({ server, owner, repo })
  const uri = server + '/' + Path.join(apiPath, 'repos', owner, repo, 'pulls')
  let _prBody = ""
  if ( prBody ) { _prBody = prBody }
  let payload = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenid}` },
    body: `{  
        "base": "${defaultBranch}",
        "head": "${userBranch}",
        "title": "Merge ${userBranch} into ${defaultBranch} by ${username}",
        "body": "${_prBody}"
      }`,
  }
  let res = await fetch(uri, payload)
  let pr_json = {}
  let pr_num = "";
  switch (res.status) {
    case 409:
      // then the body.message will contain the pr number in the issue_id field
      pr_json = await res.json()
      const msg = pr_json.message
      // have to parse the text returned. Hopefully it doesn't change!
      // here is an example: 
      // message:
      //"pull request already exists for these targets 
      // [id: 11033, 
      // issue_id: 3358, <<<--- this is the PR number
      // head_repo_id: 11419, 
      // base_repo_id: 11419, 
      // head_branch: gt-RUT-cecil.new, 
      // base_branch: master]"
      pr_num = msg.split("issue_id: ")[1].split(",")[0]
      // console.log("pr_num:", pr_num)
      return await getPrJson({ server, owner, repo, prId: pr_num })
    case 404:
      // in our case this is not an error, just a quick feedback that branch is not present
      // console.error(`getPrJsonByUserBranch() http error: res.status=${res.status}`, server, owner, repo, userBranch)
      throw Error(`branch ${userBranch} does not exist`)
    case 201:
      return await res.json()
    default:
      console.error(`getPrJsonByUserBranch() http error: res.status=${res.status}`, server, owner, repo, userBranch)
      throw Error("unknown error")
  }
}

// example: GET https://qa.door43.org/api/v1/repos/unfoldingword/en_ult
export async function getRepoJson({
  server, owner, repo,
}) {
  const uri = server + '/' + Path.join(apiPath, 'repos', owner, repo)
  let res = {}
  try {
    res = await fetch(uri);
  } catch (e) {
    console.error(`getRepoJson() fetch failed`, uri, e)
    return Error(`error fetching ${uri}`)
  }
  switch (res.status) {
    case 404:
      console.error(`getRepoJson() http error: res.status=${res.status}`, server, owner, repo)
      throw Error(`repository ${owner}/${repo} doesn't exist`)
    case 200:
      return await res.json();
    default:
      console.error(`getRepoJson() http error: res.status=${res.status}`, server, owner, repo)
      throw Error('unknown error')
  }
}

export async function getRepoDefaultBranch({
  server, owner, repo,
}) {
  const repoJson = await getRepoJson({ server, owner, repo })
  return repoJson.default_branch
}

// example: POST https://qa.door43.org/api/v1/repos/unfoldingword/en_ult/pulls/3358/update
export async function updatePullRequest({
  server, owner, repo, prNum, tokenid
}) {
  const uri = server + '/' +
    Path.join(apiPath, 'repos', owner, repo, 'pulls', `${prNum}`, 'update')

  let res_json = {};
  return await fetch(uri + `?token=${tokenid}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
}

// example: POST https://qa.door43.org/api/v1/repos/unfoldingword/en_ult/pulls/3358/merge
export async function mergePullRequest({
  server, owner, repo, prNum, prBody, tokenid
}) {

  // if pr body is not empty, then first update the PR with it
  // example: 
  /*
    curl -X 'PATCH' \
      'https://qa.door43.org/api/v1/repos/dcs-poc-org/en_tn/pulls/2' \
      -H 'accept: application/json' \
      -H 'authorization: Basic your-psw-here' \
      -H 'Content-Type: application/json' \
      -d '{
      "body": "This is an update test!"
    }'

    Status on success is a 201
  */
  if ( prBody && prBody !== "" ) {
    console.log("Updating PR with description:", prBody)
    const uri = server + '/' + Path.join(apiPath, 'repos', owner, repo, 'pulls', `${prNum}`)
    let res = {}
    try {
      res = await fetch(uri + `?token=${tokenid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: `{
            "body": "${prBody}"
        }`,
      })
    } catch (e) {
      return Error(`error fetching to update PR: ${uri}`)
    }
    if ( res.status !== 201 ) {
      throw Error(`Unknown error on update to PR, status ${res.status}`)
    }
  }

  // now do the merge
  const uri = server + '/' +
    Path.join(apiPath, 'repos', owner, repo, 'pulls', `${prNum}`, 'merge')
  return await fetch(uri + `?token=${tokenid}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: `{
        "Do": "squash",
        "delete_branch_after_merge": true,
        "force_merge": true
      }`,
  })
}

/*
The URL for base contents:
https://git.door43.org/api/v1/repos/dcs-poc-org/en_tn/contents/tn_TIT.tsv?ref=2d137737c84b93c4336d1de2937f89269fba9e93
*/
export async function getContentsSha({
  server, owner, repo, filename, commitSha
}) {
  const uri = server + '/' + Path.join(apiPath, 'repos', owner, repo, 'contents', filename, '?ref='+commitSha)
  // console.log("getContentsSha() uri:", uri)
  let sha = null
  try {
    const res = await fetch(uri);
    const cJson = await res.json();
    sha = cJson.sha
  } catch (e) {
    console.log("getContentsSha() error:", e)
    sha = null
  }
  return sha
}



export async function checkFilenameUpdateable({
  server, owner, repo, prJson, filename
}) {
  let fileIsUpdateable = false
  // get the SHAs we need
  // const headSha = prJson.head.sha
  const baseSha = prJson.base.sha
  const mergeBase = prJson.merge_base

  // Case 1. has master had any updates?
  if ( mergeBase === baseSha ) {
    // master has not changed since branch created
    fileIsUpdateable = false
  } else {
    // master has been update since branch created
    // Therefore check if file has been updated in master
    const mergeBaseFileSha = await getContentsSha({server, owner, repo, filename, commitSha: mergeBase})
    const baseFileSha = await getContentsSha({server, owner, repo, filename, commitSha: baseSha})
    // console.log("checkFilenameUpdateable() mergeBaseFileSha, baseFileSha",mergeBaseFileSha, baseFileSha)
    if ( mergeBaseFileSha === null || baseFileSha === null ) {
      // then an error may have happened during fetch
      fileIsUpdateable = false
    }
    if ( mergeBaseFileSha === baseFileSha ) {
      // then file has not been updated in master branch
      fileIsUpdateable = false
    } else {
      fileIsUpdateable = true
    }
  }
  // console.log("checkFilenameUpdateable() returning:", fileIsUpdateable)
  return fileIsUpdateable
}
