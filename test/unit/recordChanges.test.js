import {describe, it, expect, vi} from 'vitest'
import '../../src/components/GrampsjsRecordChanges.js'
import {proposalChanges} from '../../src/chatProposal.js'

const person = (handle, first, surname) => ({
  _class: 'Person',
  handle,
  primary_name: {
    first_name: first,
    surname_list: [{surname, prefix: '', connector: ''}],
    suffix: '',
  },
})

function makeList(apiGet, transaction = []) {
  const list = document.createElement('grampsjs-record-changes')
  list.appState = {apiGet, i18n: {strings: {}, lang: 'en'}}
  list.changes = proposalChanges(transaction)
  list.records = transaction.map(item => item.new ?? item.old)
  return list
}

describe('the record changes', () => {
  it('describes a new family by its parents in the transaction', () => {
    const list = makeList(vi.fn(), [
      {
        type: 'add',
        _class: 'Person',
        handle: 'P2',
        old: null,
        new: person('P2', 'Diana', 'Spencer'),
      },
      {
        type: 'add',
        _class: 'Family',
        handle: 'F1',
        old: null,
        new: {
          _class: 'Family',
          handle: 'F1',
          father_handle: 'P1',
          mother_handle: 'P2',
        },
      },
    ])
    list._objects = {P1: person('P1', 'Charles', 'Windsor')}
    expect(list._recordLabel('family', 'F1')).toEqual([
      'Charles Windsor',
      ' & ',
      'Diana Spencer',
    ])
  })

  it('stops linking a record once the change deleting it is applied', () => {
    const list = makeList(vi.fn(), [
      {
        type: 'delete',
        _class: 'Note',
        handle: 'N1',
        old: {
          _class: 'Note',
          handle: 'N1',
          gramps_id: 'N0001',
          text: {string: 'Old'},
        },
        new: null,
      },
    ])
    list._objects = {
      N1: {
        _class: 'Note',
        handle: 'N1',
        gramps_id: 'N0001',
        text: {string: 'Old'},
      },
      N2: {
        _class: 'Note',
        handle: 'N2',
        gramps_id: 'N0002',
        text: {string: 'Kept'},
      },
    }
    const isLink = handle =>
      Boolean(
        list
          ._renderRef({kind: 'ref', objClass: 'note', handle})
          ?.strings?.join('')
          .includes('<a ')
      )
    expect(isLink('N1')).toBe(true)
    list.applied = true
    expect(isLink('N1')).toBe(false)
    expect(isLink('N2')).toBe(true)
  })

  it('fetches each record once and retries after a failure', async () => {
    const apiGet = vi
      .fn()
      .mockResolvedValueOnce({error: 'Failed'})
      .mockResolvedValue({data: [{handle: 'P1', gramps_id: 'I0001'}]})
    const list = makeList(apiGet)
    const changes = [
      {type: 'update', objClass: 'person', handle: 'P1', rows: []},
    ]

    await list._fetchRecords(changes)
    expect(list._objects).toEqual({})
    await list._fetchRecords(changes)
    await list._fetchRecords(changes)

    expect(apiGet).toHaveBeenCalledTimes(2)
    expect(apiGet).toHaveBeenLastCalledWith(
      '/api/people/?handles=P1&profile=self&locale=en'
    )
    expect(list._objects.P1.gramps_id).toBe('I0001')
  })

  it('fetches added records only once the changes are applied', async () => {
    const apiGet = vi.fn().mockResolvedValue({data: []})
    const list = makeList(apiGet)
    const changes = [{type: 'add', objClass: 'note', handle: 'N1', rows: []}]

    await list._fetchRecords(changes)
    expect(apiGet).not.toHaveBeenCalled()
    list.applied = true
    await list._fetchRecords(changes)
    expect(apiGet).toHaveBeenCalledWith(
      '/api/notes/?handles=N1&profile=self&locale=en'
    )
  })
})
