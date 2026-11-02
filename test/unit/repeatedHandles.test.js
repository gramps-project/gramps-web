import {describe, it, expect, vi} from 'vitest'
import {GrampsjsViewObjectsDetail} from '../../src/views/GrampsjsViewObjectsDetail.js'
import {GrampsjsViewObject} from '../../src/views/GrampsjsViewObject.js'

const A = {handle: 'a', gramps_id: 'C1'}
const B = {handle: 'b', gramps_id: 'C2'}

function makeDetailView(handles) {
  const view = Object.create(GrampsjsViewObjectsDetail.prototype)
  view.handles = handles
  return view
}

// a view whose object update applies the change locally
function makeObjectView(obj) {
  const view = Object.create(GrampsjsViewObject.prototype)
  view.appState = {apiPut: vi.fn().mockResolvedValue({data: []})}
  view._updateData = vi.fn().mockResolvedValue()
  view._data = obj
  view._className = 'person'
  return view
}

describe('repeated handles in a detail list', () => {
  it('shows every entry at its position', () => {
    const view = makeDetailView(['a', 'b', 'a'])
    view._arrangeData([B, A])
    expect(view._data).to.deep.equal([A, B, A])
  })

  it('skips handles the response does not contain', () => {
    const view = makeDetailView(['a', 'x', 'b'])
    view._arrangeData([A, B])
    expect(view._data).to.deep.equal([A, B])
  })
})

describe('deleting from a list with repeated handles', () => {
  it('removes only the selected entry', async () => {
    const view = makeObjectView({
      handle: 'p',
      citation_list: ['a', 'b', 'a'],
    })
    await view.delObjectByIndex(2, view._data, 'person', 'citation_list')
    const [, sent] = view.appState.apiPut.mock.calls[0]
    expect(sent.citation_list).to.deep.equal(['a', 'b'])
  })
})
