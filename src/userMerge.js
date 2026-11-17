// Helpers for merging a user into another one (site admins only).

// Mirrors the API, which maps an empty tree to the default tree in a
// single-tree setup.
function sameTree(a, b, ismulti) {
  return !ismulti || (a.tree || '') === (b.tree || '')
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
