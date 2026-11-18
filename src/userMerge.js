// Helpers for merging a user into another one (site admins only).

// Mirrors the API, which maps an empty tree to the default tree in a
// single-tree setup but compares explicit tree IDs as they are.
function sameTree(a, b, ismulti) {
  const treeA = a.tree || ''
  const treeB = b.tree || ''
  if (ismulti || (treeA && treeB)) {
    return treeA === treeB
  }
  return true
}

// A merge interrupted by signing in again through a provider, which leaves
// the page; offered again when the user list loads.
const RESUME_KEY = 'user_merge_resume'
const RESUME_MAX_AGE_MS = 10 * 60 * 1000

export function saveMergeResume(merge) {
  try {
    sessionStorage.setItem(
      RESUME_KEY,
      JSON.stringify({...merge, at: Date.now()})
    )
  } catch {
    // then the admin starts the merge again after signing in
  }
}

export function takeMergeResume() {
  try {
    const value = JSON.parse(sessionStorage.getItem(RESUME_KEY))
    sessionStorage.removeItem(RESUME_KEY)
    return value?.source &&
      value?.target &&
      Date.now() - value.at < RESUME_MAX_AGE_MS
      ? {source: value.source, target: value.target}
      : null
  } catch {
    return null
  }
}

// The users that `source` can be merged into: others of the same tree whose
// role is not lower, which the API would refuse.
export function mergeTargets(users, source, ismulti) {
  if (!source) {
    return []
  }
  return users
    .filter(
      user =>
        user.name !== source.name &&
        sameTree(user, source, ismulti) &&
        (user.role ?? 0) >= (source.role ?? 0)
    )
    .sort((a, b) => a.name.localeCompare(b.name))
}
