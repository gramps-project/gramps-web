import {describe, it, expect, vi} from 'vitest'
import {
  eventInContextData,
  eventInContextChanges,
  hasOtherParticipants,
} from '../../src/components/GrampsjsFormEditEventInContext.js'
import {GrampsjsViewObject} from '../../src/views/GrampsjsViewObject.js'
import {
  participantRefRows,
  participantRefChanges,
} from '../../src/components/GrampsjsParticipants.js'
import {emptyDate, changeParticipantRefs, fireEvent} from '../../src/util.js'
import '../../src/components/GrampsjsAttributes.js'
import {changeRefAttributes} from '../../src/components/GrampsjsFormEventRef.js'
import {fetchRefObjects} from '../../src/components/GrampsjsRefDetails.js'

const date = {_class: 'Date', dateval: [1, 2, 1820, false]}
const event = {
  _class: 'Event',
  handle: 'e1',
  type: 'Baptism',
  date,
  description: 'Baptism of Johann',
  place: 'p1',
}

describe('editing an event from a linked person', () => {
  it('starts from the event fields', () => {
    expect(eventInContextData(event)).to.deep.equal({
      type: 'Baptism',
      date,
      description: 'Baptism of Johann',
      place: 'p1',
      private: false,
    })
  })

  it('reads a type object as its string', () => {
    const data = eventInContextData({
      ...event,
      type: {_class: 'EventType', string: 'Birth'},
    })
    expect(data.type).to.equal('Birth')
  })

  it('reports nothing when nothing changed', () => {
    expect(eventInContextChanges(eventInContextData(event), event)).to.equal(
      null
    )
  })

  it('treats a missing date and an empty date as equal', () => {
    const undated = {...event, date: undefined}
    const data = {...eventInContextData(undated), date: emptyDate}
    expect(eventInContextChanges(data, undated)).to.equal(null)
  })

  it('reports a change of the event privacy', () => {
    const data = {...eventInContextData(event), private: true}
    expect(eventInContextChanges(data, event)).to.deep.equal({private: true})
    const hidden = {...event, private: true}
    expect(eventInContextData(hidden).private).to.equal(true)
    expect(
      eventInContextChanges(
        {...eventInContextData(hidden), private: false},
        hidden
      )
    ).to.deep.equal({private: false})
  })

  it('returns only the changed event fields', () => {
    const newDate = {_class: 'Date', dateval: [3, 2, 1820, false]}
    const data = {...eventInContextData(event), date: newDate, place: undefined}
    expect(eventInContextChanges(data, event)).to.deep.equal({
      date: newDate,
      place: '',
    })
  })
})

describe('other participants of an event', () => {
  const me = {role: 'Primary', person: {handle: 'me'}}
  const anna = {role: 'Godmother', person: {handle: 'a'}}
  const family = {role: 'Family', family: {handle: 'f'}}

  it('is false when the owner is the only participant', () => {
    expect(hasOtherParticipants({people: [me, me]}, 'me')).to.equal(false)
  })

  it('counts other people and families', () => {
    expect(hasOtherParticipants({people: [me, anna]}, 'me')).to.equal(true)
    expect(
      hasOtherParticipants({people: [me], families: [family]}, 'me')
    ).to.equal(true)
  })

  it('is false without participants', () => {
    expect(hasOtherParticipants(undefined, 'me')).to.equal(false)
  })
})

describe('rows of the participants list', () => {
  const participants = {
    people: [
      {role: 'Pate', person: {handle: 'a', gramps_id: 'I1'}},
      {role: 'Zeuge', person: {handle: 'a', gramps_id: 'I1'}},
      {role: 'Hauptperson', person: {handle: 'b', gramps_id: 'I2'}},
    ],
    families: [{role: 'Familie', family: {handle: 'f', gramps_id: 'F1'}}],
  }
  const backlinks = [
    {
      handle: 'a',
      event_ref_list: [
        {ref: 'e1', role: 'Godfather'},
        {ref: 'x', role: 'Primary'},
        {ref: 'e1', role: {_class: 'EventRoleType', string: 'Witness'}},
      ],
    },
    {handle: 'f', event_ref_list: [{ref: 'e1', role: 'Family'}]},
  ]

  it('counts repeated references of one participant', () => {
    const rows = participantRefRows(participants, backlinks, 'e1')
    expect(rows.map(r => [r.handle, r.occurrence])).to.deep.equal([
      ['f', 0],
      ['a', 0],
      ['a', 1],
      ['b', 0],
    ])
  })

  it('reads the privacy of the stored reference', () => {
    const rows = participantRefRows(
      participants,
      [
        {
          handle: 'a',
          event_ref_list: [
            {ref: 'e1', role: 'Godfather', private: true},
            {ref: 'e1', role: 'Witness'},
          ],
        },
      ],
      'e1'
    )
    expect(rows.map(r => r.refPrivate)).to.deep.equal([
      false,
      true,
      false,
      false,
    ])
  })

  it('reads the citations, notes and attributes of each reference', () => {
    const attr = {_class: 'Attribute', type: 'Age', value: '34'}
    const rows = participantRefRows(
      participants,
      [
        {
          handle: 'a',
          event_ref_list: [
            {ref: 'e1', citation_list: ['c1', 'c1'], note_list: ['n1']},
            {ref: 'e1', attribute_list: [attr]},
          ],
        },
      ],
      'e1'
    )
    expect(rows.map(r => [r.citations, r.notes, r.attributes])).to.deep.equal([
      [[], [], []],
      [['c1', 'c1'], ['n1'], []],
      [[], [], [attr]],
      [[], [], []],
    ])
  })

  it('reads the untranslated role from the stored reference', () => {
    const rows = participantRefRows(participants, backlinks, 'e1')
    expect(rows.map(r => r.roleValue)).to.deep.equal([
      'Family',
      'Godfather',
      'Witness',
      '',
    ])
  })
})

describe('editing the reference of a participant', () => {
  const row = {roleValue: 'Godfather', refPrivate: false}

  it('reports nothing when nothing changed', () => {
    expect(
      participantRefChanges({role: 'Godfather', private: false}, row)
    ).to.equal(null)
  })

  it('reports the changed privacy of the reference', () => {
    expect(
      participantRefChanges({role: 'Godfather', private: true}, row)
    ).to.deep.equal({private: true})
    expect(
      participantRefChanges(
        {role: 'Godfather', private: false},
        {...row, refPrivate: true}
      )
    ).to.deep.equal({private: false})
  })

  it('reports role and privacy together', () => {
    expect(
      participantRefChanges(
        {role: {_class: 'EventRoleType', string: 'Witness'}, private: true},
        row
      )
    ).to.deep.equal({role: 'Witness', private: true})
  })

  it('reports changed citations, notes and attributes', () => {
    const attr = {_class: 'Attribute', type: 'Age', value: '34'}
    const stored = {
      ...row,
      citations: ['c1'],
      notes: ['n1'],
      attributes: [attr],
    }
    expect(
      participantRefChanges(
        {
          role: 'Godfather',
          private: false,
          citation_list: ['c1', 'c2'],
          note_list: ['n1'],
          attribute_list: [],
        },
        stored
      )
    ).to.deep.equal({citation_list: ['c1', 'c2'], attribute_list: []})
  })

  it('reports reordered citations', () => {
    expect(
      participantRefChanges(
        {role: 'Godfather', citation_list: ['c2', 'c1']},
        {...row, citations: ['c1', 'c2']}
      )
    ).to.deep.equal({citation_list: ['c2', 'c1']})
  })

  it('keeps the stored role when the role is empty', () => {
    expect(participantRefChanges({role: '', private: false}, row)).to.equal(
      null
    )
  })
})

describe('changing the references of a participant', () => {
  const refs = [
    {_class: 'EventRef', ref: 'e1', role: 'Godfather'},
    {_class: 'EventRef', ref: 'x', role: 'Primary'},
    {_class: 'EventRef', ref: 'e1', role: 'Witness', private: true},
  ]

  it('adds a reference at the end', () => {
    expect(
      changeParticipantRefs(refs, 'e1', {action: 'add', role: 'Witness'})
    ).to.deep.equal([...refs, {_class: 'EventRef', ref: 'e1', role: 'Witness'}])
  })

  it('updates only the selected repeated reference', () => {
    const result = changeParticipantRefs(refs, 'e1', {
      action: 'update',
      occurrence: 1,
      data: {role: 'Godmother'},
    })
    expect(result).to.deep.equal([
      refs[0],
      refs[1],
      {...refs[2], role: 'Godmother'},
    ])
  })

  it('removes only the selected repeated reference', () => {
    expect(
      changeParticipantRefs(refs, 'e1', {action: 'remove', occurrence: 0})
    ).to.deep.equal([refs[1], refs[2]])
  })

  it('returns null for a reference that does not exist', () => {
    expect(
      changeParticipantRefs(refs, 'e1', {action: 'remove', occurrence: 2})
    ).to.equal(null)
  })
})

describe('saving participant changes from the event page', () => {
  function makeEventView(person) {
    const view = Object.create(GrampsjsViewObject.prototype)
    view.appState = {
      apiGet: vi.fn().mockResolvedValue({data: person}),
      apiPut: vi.fn().mockResolvedValue({data: []}),
    }
    view._updateData = vi.fn().mockResolvedValue()
    view.dispatchEvent = vi.fn()
    view._data = event
    view._className = 'event'
    return view
  }

  it('saves the changed reference on the participant', async () => {
    const person = {
      handle: 'a',
      event_ref_list: [{_class: 'EventRef', ref: 'e1', role: 'Godfather'}],
      extended: {},
    }
    const view = makeEventView(person)
    await view.changeParticipantRef({
      objectType: 'person',
      handle: 'a',
      action: 'update',
      occurrence: 0,
      data: {role: 'Witness'},
    })
    expect(view.appState.apiGet.mock.calls[0][0]).to.equal('/api/people/a')
    const [url, sent] = view.appState.apiPut.mock.calls[0]
    expect(url).to.equal('/api/people/a')
    expect(sent._class).to.equal('Person')
    expect(sent.extended).to.equal(undefined)
    expect(sent.event_ref_list).to.deep.equal([
      {_class: 'EventRef', ref: 'e1', role: 'Witness'},
    ])
  })

  it('changes the event it started on, after moving to another', async () => {
    const view = makeEventView({handle: 'a', event_ref_list: []})
    view.appState.apiGet.mockImplementation(async () => {
      view._data = {...event, handle: 'e2'}
      return {data: {handle: 'a', event_ref_list: []}}
    })
    await view.changeParticipantRef({
      objectType: 'person',
      handle: 'a',
      action: 'add',
      role: 'Witness',
    })
    const [, sent] = view.appState.apiPut.mock.calls[0]
    expect(sent.event_ref_list).to.deep.equal([
      {_class: 'EventRef', ref: 'e1', role: 'Witness'},
    ])
  })

  it('does not save when the reference is gone', async () => {
    const view = makeEventView({handle: 'a', event_ref_list: []})
    await view.changeParticipantRef({
      objectType: 'person',
      handle: 'a',
      action: 'remove',
      occurrence: 0,
    })
    expect(view.appState.apiPut).not.toHaveBeenCalled()
  })
})

describe('saving an event edited from a linked person', () => {
  it('saves the changed fields on the event', async () => {
    const view = Object.create(GrampsjsViewObject.prototype)
    view.appState = {apiPut: vi.fn().mockResolvedValue({data: []})}
    view._updateData = vi.fn().mockResolvedValue()
    view._data = {handle: 'me'}
    view._className = 'person'
    await view.updateLinkedEvent(
      {...event, extended: {}, profile: {}},
      {description: 'Baptism'}
    )
    const [url, sent] = view.appState.apiPut.mock.calls[0]
    expect(url).to.equal('/api/events/e1')
    expect(sent).to.deep.equal({...event, description: 'Baptism'})
  })
})

describe('setting the privacy of media from a linked object', () => {
  it('saves the privacy on the media object', async () => {
    const view = Object.create(GrampsjsViewObject.prototype)
    view.appState = {apiPut: vi.fn().mockResolvedValue({data: []})}
    view._updateData = vi.fn().mockResolvedValue()
    const media = {_class: 'Media', handle: 'm1', path: 'a.jpg', private: false}
    await view.updateLinkedMedia(
      {...media, extended: {}, profile: {}},
      {private: true}
    )
    const [url, sent] = view.appState.apiPut.mock.calls[0]
    expect(url).to.equal('/api/media/m1')
    expect(sent).to.deep.equal({...media, private: true})
  })
})

describe('selection in the participants list', () => {
  it('is cleared when a change is saved', () => {
    const list = document.createElement('grampsjs-participants')
    const actions = []
    list.addEventListener('edit:action', e => actions.push(e.detail))
    list._selectedIndex = 1
    list._fireChange({action: 'add', objectType: 'person', handle: 'a'})
    expect(list._selectedIndex).to.equal(-1)
    expect(actions[0].action).to.equal('changeParticipantRef')
  })
})

describe('editing the attributes of a reference', () => {
  const age = {_class: 'Attribute', type: 'Age', value: '34'}
  const occ = {_class: 'Attribute', type: 'Occupation', value: 'Farmer'}

  it('adds an attribute at the end', () => {
    expect(
      changeRefAttributes([age], {
        action: 'addAttribute',
        data: {type: 'Occupation', value: 'Farmer'},
      })
    ).to.deep.equal([age, occ])
  })

  it('adds the first attribute to a missing list', () => {
    expect(
      changeRefAttributes(undefined, {
        action: 'addAttribute',
        data: {type: 'Age', value: '34'},
      })
    ).to.deep.equal([age])
  })

  it('updates, removes and moves only the selected attribute', () => {
    const list = [age, occ, age]
    expect(
      changeRefAttributes(list, {
        action: 'updateAttribute',
        index: 2,
        data: {value: '35'},
      })
    ).to.deep.equal([age, occ, {...age, value: '35'}])
    expect(
      changeRefAttributes(list, {action: 'delAttr', index: 0})
    ).to.deep.equal([occ, age])
    expect(
      changeRefAttributes(list, {action: 'moveListItem', index: 0, to: 1})
    ).to.deep.equal([occ, age, age])
  })

  it('ignores an action on an attribute that does not exist', () => {
    expect(changeRefAttributes([age], {action: 'delAttr', index: 1})).to.equal(
      null
    )
    expect(
      changeRefAttributes([age], {action: 'moveListItem', index: 0, to: 1})
    ).to.equal(null)
  })
})

describe('fetching the citations of a reference', () => {
  it('keeps the order and repeated handles, and leaves out missing ones', async () => {
    const appState = {
      i18n: {lang: 'de'},
      apiGet: vi.fn(async url =>
        url.includes('/missing?')
          ? {error: 'Not found'}
          : {data: {handle: url.split('/')[3].split('?')[0]}}
      ),
    }
    const objects = await fetchRefObjects(appState, 'citation', 'citations', [
      'a',
      'missing',
      'b',
      'a',
    ])
    expect(objects.map(obj => obj.handle)).to.deep.equal(['a', 'b', 'a'])
    expect(objects[0]).to.deep.equal({
      object_type: 'citation',
      handle: 'a',
      object: {handle: 'a'},
    })
    expect(appState.apiGet).toHaveBeenCalledTimes(3)
    expect(appState.apiGet.mock.calls[0][0]).to.equal(
      '/api/citations/a?extend=all&profile=all&locale=de'
    )
  })
})

describe('cancelling the attribute dialog inside another dialog', () => {
  it('does not cancel the dialog around the attributes list', () => {
    const outer = document.createElement('div')
    const list = document.createElement('grampsjs-attributes')
    outer.append(list)
    const cancelled = []
    outer.addEventListener('object:cancel', () => cancelled.push(true))
    list.addEventListener('object:cancel', e => list._handleAttrCancel(e))
    list.dialogContent = 'dialog'
    fireEvent(list, 'object:cancel')
    expect(list.dialogContent).to.equal('')
    expect(cancelled).to.deep.equal([])
  })
})
