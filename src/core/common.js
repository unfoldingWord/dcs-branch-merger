import Path from 'path'
import { apiPath } from './constants'


// example: https://qa.door43.org/api/v1/repos/unfoldingword/en_ult/pulls/3358
export async function getPrJson({
    server, owner, repo, prId,
  }) {
    const date = new Date(Date.now())
    const dateString = date.toISOString()
    const uri = "https://" + server + '/' + Path.join(apiPath,'repos',owner,repo,'pulls', prId)
    let res = {}
    try {
      res = await fetch(uri);
    } catch (e) {
        return null
    }
    return res.json()
}