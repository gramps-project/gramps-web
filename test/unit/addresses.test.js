import {describe, it, expect} from 'vitest'
import {render} from 'lit'
import {GrampsjsAddresses} from '../../src/components/GrampsjsAddresses.js'

// Render the component and return its rows as [label, value] pairs.
const renderRows = (data, profile) => {
  const element = new GrampsjsAddresses()
  element.appState = {i18n: {strings: {}}}
  element.data = data
  element.profile = profile

  const shadowRoot = element.createRenderRoot()
  render(element.render(), shadowRoot)

  return [...shadowRoot.querySelectorAll('dl > div')].map(row => [
    row.querySelector('dt').textContent,
    row.querySelector('dd').textContent,
  ])
}

const date = dateval => ({
  _class: 'Date',
  calendar: 0,
  modifier: 0,
  quality: 0,
  dateval,
  sortval: 0,
  text: '',
})

describe('address dates', () => {
  it('shows the date string supplied by the profile', () => {
    const rows = renderRows(
      [{street: 'High Street'}],
      [{date_str: '1990-03-15'}]
    )
    expect(rows).to.deep.equal([
      ['Date', '1990-03-15'],
      ['Street', 'High Street'],
    ])
  })

  it('omits the date row for an address the profile reports as undated', () => {
    const rows = renderRows(
      [{street: 'High Street', date: date([2, 1, 2000, false])}],
      [{date_str: ''}]
    )
    expect(rows).to.deep.equal([['Street', 'High Street']])
  })

  it('takes the date of each address from the profile entry of the same index', () => {
    const rows = renderRows(
      [{street: 'High Street'}, {street: 'Mill Lane'}],
      [{date_str: '1850'}, {date_str: '1860'}]
    )
    expect(rows).to.deep.equal([
      ['Date', '1850'],
      ['Street', 'High Street'],
      ['Date', '1860'],
      ['Street', 'Mill Lane'],
    ])
  })

  // Every object type with addresses formats their dates in its profile, so
  // this only happens when the object was loaded without a profile.
  describe('for an object loaded without a profile', () => {
    it('falls back to formatting the date held on the address', () => {
      const rows = renderRows(
        [{street: 'High Street', date: date([2, 1, 2000, false])}],
        []
      )
      expect(rows).to.deep.equal([
        ['Date', '2000-1-2'],
        ['Street', 'High Street'],
      ])
    })

    it('omits the date row for an address with no date at all', () => {
      const rows = renderRows([{street: 'High Street'}], [])
      expect(rows).to.deep.equal([['Street', 'High Street']])
    })

    it('omits the date row for an address holding an empty date', () => {
      const rows = renderRows(
        [{street: 'High Street', date: date([0, 0, 0, false])}],
        []
      )
      expect(rows).to.deep.equal([['Street', 'High Street']])
    })
  })
})
