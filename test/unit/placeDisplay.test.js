import {describe, it, expect} from 'vitest'
import {
  PLACE_DISPLAY_NAME,
  PLACE_DISPLAY_TITLE,
  normalizePlaceDisplay,
  placeDisplayLabel,
  placeDisplayText,
} from '../../src/placeDisplay.js'
import {objectDetail} from '../../src/util.js'

const birth = {
  date: '1 Jan 1900',
  place: 'Springfield, Sangamon County, Illinois, United States',
  place_name: 'Springfield',
}

describe('normalizePlaceDisplay', () => {
  it('defaults to the name when the setting is absent', () => {
    expect(normalizePlaceDisplay(undefined)).to.equal(PLACE_DISPLAY_NAME)
  })

  it('keeps a known value', () => {
    expect(normalizePlaceDisplay(PLACE_DISPLAY_TITLE)).to.equal(
      PLACE_DISPLAY_TITLE
    )
  })

  it('falls back to the name for an unknown value', () => {
    expect(normalizePlaceDisplay('hierarchy')).to.equal(PLACE_DISPLAY_NAME)
  })
})

describe('placeDisplayText', () => {
  it('shows only the place name by default', () => {
    expect(placeDisplayText(birth)).to.equal('Springfield')
  })

  it('shows the full title when asked for it', () => {
    expect(placeDisplayText(birth, PLACE_DISPLAY_TITLE)).to.equal(
      'Springfield, Sangamon County, Illinois, United States'
    )
  })

  it('uses the name when the profile has no title', () => {
    expect(
      placeDisplayText({place_name: 'Springfield'}, PLACE_DISPLAY_TITLE)
    ).to.equal('Springfield')
  })

  it('uses the title when the profile has no name', () => {
    expect(placeDisplayText({place: 'Springfield, Illinois'})).to.equal(
      'Springfield, Illinois'
    )
  })

  it('returns an empty string without a profile', () => {
    expect(placeDisplayText(undefined)).to.equal('')
    expect(placeDisplayText(null, PLACE_DISPLAY_TITLE)).to.equal('')
  })
})

describe('placeDisplayLabel', () => {
  it('labels both options', () => {
    expect(placeDisplayLabel(PLACE_DISPLAY_NAME)).to.equal('Name only')
    expect(placeDisplayLabel(PLACE_DISPLAY_TITLE)).to.equal('Full hierarchy')
  })

  it('labels an unknown value like the default', () => {
    expect(placeDisplayLabel('hierarchy')).to.equal('Name only')
  })

  it('translates the label', () => {
    const translate = key => (key === 'Full hierarchy' ? 'Vollständig' : key)
    expect(placeDisplayLabel(PLACE_DISPLAY_TITLE, translate)).to.equal(
      'Vollständig'
    )
  })
})

describe('objectDetail with a place display setting', () => {
  const person = {profile: {birth, death: {}}}

  it('keeps the place name by default', () => {
    expect(objectDetail('person', person, {})).to.contain('Springfield')
    expect(objectDetail('person', person, {})).not.to.contain('Sangamon')
  })

  it('uses the full title when the setting asks for it', () => {
    const detail = objectDetail(
      'person',
      person,
      {},
      {
        placeDisplay: PLACE_DISPLAY_TITLE,
      }
    )
    expect(detail).to.contain('Springfield, Sangamon County')
  })

  it('applies to events as well', () => {
    expect(
      objectDetail(
        'event',
        {profile: birth},
        {},
        {
          placeDisplay: PLACE_DISPLAY_TITLE,
        }
      )
    ).to.contain('Sangamon County')
    expect(objectDetail('event', {profile: birth}, {})).not.to.contain(
      'Sangamon'
    )
  })
})
