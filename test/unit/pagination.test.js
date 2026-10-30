import {describe, it, expect, afterEach} from 'vitest'
import '../../src/components/GrampsjsPagination.js'

const mounted = []

const appState = {i18n: {lang: 'en', strings: {}}}

async function mount(props) {
  const el = document.createElement('grampsjs-pagination')
  Object.assign(el, {appState, ...props})
  document.body.appendChild(el)
  mounted.push(el)
  await el.updateComplete
  return el
}

afterEach(() => {
  mounted.splice(0).forEach(el => el.remove())
})

const range = el => el.shadowRoot.querySelector('.range').textContent
const buttons = el => [...el.shadowRoot.querySelectorAll('md-icon-button')]

describe('grampsjs-pagination', () => {
  it('renders nothing without pages', async () => {
    const el = await mount({pages: -1})
    expect(el.shadowRoot.querySelector('.paging')).toBeNull()
  })

  it('shows the range of objects on the page', async () => {
    const el = await mount({page: 2, pages: 134, total: 3214, pageSize: 24})
    expect(range(el)).toBe('25–48 of 3,214')
  })

  it('clamps the range on the last page', async () => {
    const el = await mount({page: 134, pages: 134, total: 3214, pageSize: 24})
    expect(range(el)).toBe('3,193–3,214 of 3,214')
  })

  it('shows the page number without a total', async () => {
    const el = await mount({page: 3, pages: 12})
    expect(range(el)).toBe('3 of 12')
  })

  it('uses the translated label', async () => {
    const el = await mount({
      appState: {
        i18n: {
          lang: 'de',
          strings: {'%(current)d of %(total)d': '%(current)d von %(total)d'},
        },
      },
      page: 1,
      pages: 134,
      total: 3214,
      pageSize: 24,
    })
    expect(range(el)).toBe('1–24 von 3.214')
  })

  it('disables the buttons past either end', async () => {
    const first = await mount({page: 1, pages: 3})
    expect(buttons(first).map(b => b.disabled)).toEqual([
      true,
      true,
      false,
      false,
    ])
    const last = await mount({page: 3, pages: 3})
    expect(buttons(last).map(b => b.disabled)).toEqual([
      false,
      false,
      true,
      true,
    ])
  })

  it('fires page:changed with the target page', async () => {
    const pages = []
    for (const index of [0, 1, 2, 3]) {
      // eslint-disable-next-line no-await-in-loop
      const el = await mount({page: 3, pages: 5})
      el.addEventListener('page:changed', e => pages.push(e.detail.page))
      buttons(el)[index].click()
    }
    expect(pages).toEqual([1, 2, 4, 5])
  })
})
