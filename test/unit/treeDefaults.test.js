import {describe, expect, it} from 'vitest'
import {
  DEFAULT_TREE_VIEW,
  TREE_VIEWS,
  getTreeViewTabIndex,
} from '../../src/treeDefaults.js'

describe('treeDefaults', () => {
  it('returns the correct index for known tree views', () => {
    TREE_VIEWS.forEach((view, index) => {
      expect(getTreeViewTabIndex(view)).to.equal(index)
    })
  })

  it('falls back to default view index for unknown values', () => {
    const defaultIndex = TREE_VIEWS.indexOf(DEFAULT_TREE_VIEW)
    expect(getTreeViewTabIndex('unknown-view')).to.equal(defaultIndex)
  })
})
