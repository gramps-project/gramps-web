import {describe, it, expect} from 'vitest'
import {render} from 'lit'
import {GrampsjsAddresses} from '../../src/components/GrampsjsAddresses.js'

// The Material list elements call attachInternals() in their constructor,
// which happy-dom does not implement.
if (!HTMLElement.prototype.attachInternals) {
  HTMLElement.prototype.attachInternals = function attachInternals() {
    return {}
  }
}

// Render the component and return one entry per address, holding the summary
// line and the supporting text below it.
const renderRows = (data, profile) => {
  const element = new GrampsjsAddresses()
  element.appState = {i18n: {strings: {}}}
  element.data = data
  element.profile = profile

  const shadowRoot = element.createRenderRoot()
  render(element.render(), shadowRoot)

  return [...shadowRoot.querySelectorAll('md-list-item')].map(item => ({
    summary: [...item.childNodes]
      .filter(node => node.nodeType === Node.TEXT_NODE)
      .map(node => node.textContent)
      .join('')
      .trim(),
    supporting:
      item.querySelector('[slot="supporting-text"]')?.textContent.trim() ??
      null,
    // The phone and date sit on separate lines, so report them separately.
    supportingLines: [
      ...(item.querySelector('[slot="supporting-text"]')?.childNodes ?? []),
    ]
      .filter(node => node.nodeType === Node.TEXT_NODE)
      .map(node => node.textContent.trim())
      .filter(Boolean),
  }))
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

describe('address summary', () => {
  it('lists every location field of a fully populated address', () => {
    const rows = renderRows(
      [
        {
          street: '12 High Street',
          locality: 'Oldtown',
          city: 'Cambridge',
          county: 'Cambridgeshire',
          state: 'England',
          postal: 'CB1 1AA',
          country: 'United Kingdom',
        },
      ],
      []
    )
    expect(rows[0].summary).to.equal(
      '12 High Street, Oldtown, Cambridge, Cambridgeshire, England, CB1 1AA, United Kingdom'
    )
  })

  it('omits the fields an address leaves empty', () => {
    const rows = renderRows([{street: 'High Street', country: 'Germany'}], [])
    expect(rows[0].summary).to.equal('High Street, Germany')
  })

  it('renders one row per address', () => {
    const rows = renderRows(
      [{street: 'High Street'}, {street: 'Mill Lane'}],
      []
    )
    expect(rows.map(row => row.summary)).to.deep.equal([
      'High Street',
      'Mill Lane',
    ])
  })
})

describe('address dates', () => {
  it('shows the date string supplied by the profile', () => {
    const rows = renderRows(
      [{street: 'High Street'}],
      [{date_str: '1990-03-15'}]
    )
    expect(rows[0].supporting).to.equal('1990-03-15')
  })

  it('shows no date for an address the profile reports as undated', () => {
    const rows = renderRows(
      [{street: 'High Street', date: date([2, 1, 2000, false])}],
      [{date_str: ''}]
    )
    expect(rows[0].supporting).to.equal(null)
  })

  it('takes the date of each address from the profile entry of the same index', () => {
    const rows = renderRows(
      [{street: 'High Street'}, {street: 'Mill Lane'}],
      [{date_str: '1850'}, {date_str: '1860'}]
    )
    expect(rows.map(row => row.supporting)).to.deep.equal(['1850', '1860'])
  })

  // Every object type with addresses formats their dates in its profile, so
  // this only happens when the object was loaded without a profile.
  describe('for an object loaded without a profile', () => {
    it('falls back to formatting the date held on the address', () => {
      const rows = renderRows(
        [{street: 'High Street', date: date([2, 1, 2000, false])}],
        []
      )
      expect(rows[0].supporting).to.equal('2000-1-2')
    })

    it('shows no date for an address with no date at all', () => {
      const rows = renderRows([{street: 'High Street'}], [])
      expect(rows[0].supporting).to.equal(null)
    })

    it('shows no date for an address holding an empty date', () => {
      const rows = renderRows(
        [{street: 'High Street', date: date([0, 0, 0, false])}],
        []
      )
      expect(rows[0].supporting).to.equal(null)
    })
  })
})

describe('address phone number', () => {
  it('puts the phone number and the date on separate lines', () => {
    const rows = renderRows(
      [{street: 'High Street', phone: '01223 123456'}],
      [{date_str: '1850'}]
    )
    expect(rows[0].supportingLines).to.deep.equal(['01223 123456', '1850'])
  })

  it('shows the phone number on its own for an undated address', () => {
    const rows = renderRows(
      [{street: 'High Street', phone: '01223 123456'}],
      [{date_str: ''}]
    )
    expect(rows[0].supportingLines).to.deep.equal(['01223 123456'])
  })

  it('shows the date on its own for an address with no phone number', () => {
    const rows = renderRows([{street: 'High Street'}], [{date_str: '1850'}])
    expect(rows[0].supportingLines).to.deep.equal(['1850'])
  })

  it('omits the supporting text when there is neither phone nor date', () => {
    const rows = renderRows([{street: 'High Street'}], [{date_str: ''}])
    expect(rows[0].supporting).to.equal(null)
  })
})
