import {describe, it, expect} from 'vitest'
import {rowPrivacy, renderPrivacyIcon} from '../../src/objectRender.js'
import {eventRefAt} from '../../src/components/GrampsjsEvents.js'
import {participantRefRows} from '../../src/components/GrampsjsParticipants.js'

describe('rowPrivacy', () => {
  it('is empty for public rows', () => {
    expect(rowPrivacy({private: false})).to.equal('')
    expect(rowPrivacy({private: false}, {private: false})).to.equal('')
    expect(rowPrivacy(undefined, undefined)).to.equal('')
  })

  it('is private when the item is private', () => {
    expect(rowPrivacy({private: true})).to.equal('private')
  })

  it('is link when only the link is private', () => {
    expect(rowPrivacy({private: false}, {private: true})).to.equal('link')
    expect(rowPrivacy(undefined, {private: true})).to.equal('link')
  })

  it('prefers the object when both are private', () => {
    expect(rowPrivacy({private: true}, {private: true})).to.equal('private')
  })
})

describe('renderPrivacyIcon', () => {
  const appState = canViewPrivate => ({
    permissions: {canViewPrivate},
    i18n: {strings: {}},
  })

  it('renders nothing for public rows', () => {
    expect(renderPrivacyIcon('', appState(true))).to.equal('')
  })

  it('renders nothing for users who cannot view private data', () => {
    expect(renderPrivacyIcon('private', appState(false))).to.equal('')
  })

  it('renders an icon for users who can view private data', () => {
    expect(renderPrivacyIcon('link', appState(true))).not.to.equal('')
  })
})

describe('eventRefAt', () => {
  const refs = [
    {ref: 'a', private: false},
    {ref: 'b', private: false},
    {ref: 'a', private: true},
  ]

  it('matches repeated events by occurrence', () => {
    const events = [{handle: 'a'}, {handle: 'b'}, {handle: 'a'}]
    expect(eventRefAt(events, refs, 0)).to.equal(refs[0])
    expect(eventRefAt(events, refs, 1)).to.equal(refs[1])
    expect(eventRefAt(events, refs, 2)).to.equal(refs[2])
  })

  it('stays aligned when an event is missing', () => {
    const events = [{handle: 'a'}, {handle: 'a'}]
    const withMissing = [refs[0], {ref: 'missing'}, refs[2]]
    expect(eventRefAt(events, withMissing, 1)).to.equal(refs[2])
  })

  it('is null without refs', () => {
    expect(eventRefAt([{handle: 'a'}], [], 0)).to.equal(null)
    expect(eventRefAt([{handle: 'a'}], undefined, 0)).to.equal(null)
    expect(eventRefAt([], [], 0)).to.equal(null)
  })
})

describe('participant row privacy', () => {
  const participants = {
    people: [
      {role: 'Primary', person: {handle: 'a', gramps_id: 'I1'}},
      {role: 'Witness', person: {handle: 'a', gramps_id: 'I1'}},
      {role: 'Witness', person: {handle: 'b', gramps_id: 'I2'}},
    ],
  }

  it('reads link privacy per reference', () => {
    const backlinks = [
      {
        handle: 'a',
        private: false,
        event_ref_list: [
          {ref: 'e1', private: false},
          {ref: 'e2', private: true},
          {ref: 'e1', private: true},
        ],
      },
      {handle: 'b', private: true, event_ref_list: [{ref: 'e1'}]},
    ]
    const rows = participantRefRows(participants, backlinks, 'e1')
    expect(rows.map(r => r.privacy)).to.deep.equal(['', 'link', 'private'])
  })
})
