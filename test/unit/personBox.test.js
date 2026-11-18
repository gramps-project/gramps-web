import {describe, it, expect} from 'vitest'

import '../../src/components/GrampsjsPersonBox.js'

function makeBox(familyEvents = []) {
  const box = document.createElement('grampsjs-person-box')
  box.appState = {i18n: {lang: 'en', strings: {Family: 'Familie'}}}
  box.familyEvents = familyEvents
  return box
}

describe('person box events', () => {
  it('lists family events after the own events with aligned profiles', () => {
    const box = makeBox([
      {handle: 'E3', profile: {type: 'Marriage', date: '1900'}},
    ])
    const person = {
      extended: {events: [{handle: 'E1'}, {handle: 'E2'}]},
      profile: {events: [{type: 'Birth'}]},
    }
    const {data, profile} = box._events(person)
    expect(data.map(e => e.handle)).toEqual(['E1', 'E2', 'E3'])
    expect(profile).toEqual([
      {type: 'Birth'},
      undefined,
      {type: 'Marriage', date: '1900', context: 'Familie'},
    ])
  })

  it('lists only own events without family events', () => {
    const box = makeBox()
    const person = {
      extended: {events: [{handle: 'E1'}]},
      profile: {events: [{type: 'Birth'}]},
    }
    expect(box._events(person)).toEqual({
      data: [{handle: 'E1'}],
      profile: [{type: 'Birth'}],
    })
  })
})
