import {describe, it, expect, afterEach} from 'vitest'
import '../../src/components/GrampsjsTable.js'

// md-menu calls attachInternals() in its constructor, which happy-dom does
// not implement.
if (!HTMLElement.prototype.attachInternals) {
  HTMLElement.prototype.attachInternals = function attachInternals() {
    return {}
  }
}

const mounted = []

const appState = {i18n: {lang: 'en', strings: {}}}

const columns = [
  {name: 'Name', sortKey: 'name'},
  {name: 'Birth Date', sortKey: 'birth'},
  {name: 'Note'},
]

const data = [
  ['Smith', '1900', 'b'],
  ['Adams', '1850', 'c'],
  ['Jones', '1920', 'a'],
]

async function mount(props) {
  const el = document.createElement('grampsjs-table')
  Object.assign(el, {appState, columns, data, sortable: true, ...props})
  document.body.appendChild(el)
  mounted.push(el)
  await el.updateComplete
  return el
}

afterEach(() => {
  mounted.splice(0).forEach(el => el.remove())
})

const headers = el => [...el.shadowRoot.querySelectorAll('thead th')]
const ariaSort = el => headers(el).map(th => th.getAttribute('aria-sort'))
const sortButton = (el, index) =>
  headers(el)[index].querySelector('button.sort-header')
const firstColumn = el =>
  [...el.shadowRoot.querySelectorAll('tbody tr')].map(tr =>
    tr.querySelector('td').textContent.trim()
  )

function nextSortChange(el) {
  return new Promise(resolve => {
    el.addEventListener('table:sort-changed', e => resolve(e.detail), {
      once: true,
    })
  })
}

describe('grampsjs-table sort header', () => {
  it('marks the server sort column as ascending', async () => {
    const el = await mount({serverSort: true, sortDescriptor: '+birth'})
    expect(ariaSort(el)).toEqual(['none', 'ascending', null])
  })

  it('marks the server sort column as descending', async () => {
    const el = await mount({serverSort: true, sortDescriptor: '-name'})
    expect(ariaSort(el)).toEqual(['descending', 'none', null])
  })

  it('renders a plain label for columns without a sort key', async () => {
    const el = await mount({serverSort: true})
    expect(sortButton(el, 2)).toBeNull()
    expect(headers(el)[2].textContent.trim()).toBe('Note')
  })

  it('renders plain labels when the table is not sortable', async () => {
    const el = await mount({sortable: false})
    expect(el.shadowRoot.querySelector('button.sort-header')).toBeNull()
    expect(ariaSort(el)).toEqual([null, null, null])
  })

  it('flips the direction when the active column is clicked', async () => {
    const el = await mount({serverSort: true, sortDescriptor: '+name'})
    const change = nextSortChange(el)
    sortButton(el, 0).click()
    expect(await change).toEqual({key: 'name', descending: true})
  })

  it('sorts a new column ascending', async () => {
    const el = await mount({serverSort: true, sortDescriptor: '-name'})
    const change = nextSortChange(el)
    sortButton(el, 1).click()
    expect(await change).toEqual({key: 'birth', descending: false})
  })

  it('sorts rows locally without server sort', async () => {
    const el = await mount()
    sortButton(el, 0).click()
    await el.updateComplete
    expect(firstColumn(el)).toEqual(['Adams', 'Jones', 'Smith'])
    expect(ariaSort(el)[0]).toBe('ascending')

    sortButton(el, 0).click()
    await el.updateComplete
    expect(firstColumn(el)).toEqual(['Smith', 'Jones', 'Adams'])
    expect(ariaSort(el)[0]).toBe('descending')
  })
})
