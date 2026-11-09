/* All tags of the current tree, shared by components that need the tag
list. The cache is cleared on every database change, on logout and when the
tree changes. The result has the same shape as appState.apiGet: {data} or
{error}. */

import {getTreeId} from './api.js'

let cache = null

export function clearTagCache() {
  cache = null
}

window.addEventListener('db:changed', clearTagCache)
// logging out does not reload the page
window.addEventListener('user:loggedout', clearTagCache)

export function fetchAllTags(appState) {
  const treeId = getTreeId()
  if (!cache || cache.treeId !== treeId) {
    const promise = appState.apiGet('/api/tags/?pagesize=500').then(res => {
      // allow retrying after an error
      if (!Array.isArray(res?.data) && cache?.promise === promise) {
        cache = null
      }
      return res
    })
    cache = {treeId, promise}
  }
  return cache.promise
}
