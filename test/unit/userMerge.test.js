import {describe, expect, it} from 'vitest'

import {mergeTargets} from '../../src/userMerge.js'

const users = [
  {name: 'zoe', role: 2, tree: 'a'},
  {name: 'bob', role: 1, tree: 'a'},
  {name: 'amy', role: 4, tree: 'a'},
  {name: 'eve', role: 2, tree: 'b'},
  {name: 'sam', role: 2, tree: ''},
]

const names = list => list.map(u => u.name)

describe('mergeTargets', () => {
  it('offers users of the same tree with at least the same role', () => {
    expect(names(mergeTargets(users, users[0], true))).to.deep.equal(['amy'])
  })

  it('excludes the source and sorts by name', () => {
    expect(names(mergeTargets(users, users[1], true))).to.deep.equal([
      'amy',
      'zoe',
    ])
  })

  it('ignores the tree in a single-tree setup', () => {
    expect(names(mergeTargets(users, users[0], false))).to.deep.equal([
      'amy',
      'eve',
      'sam',
    ])
  })

  it('treats a missing tree like an empty one', () => {
    const treeless = [
      {name: 'x', role: 5, tree: null},
      {name: 'y', role: 5, tree: ''},
    ]
    expect(names(mergeTargets(treeless, treeless[0], true))).to.deep.equal([
      'y',
    ])
  })

  it('returns nothing without a source', () => {
    expect(mergeTargets(users, undefined, true)).to.deep.equal([])
  })
})
