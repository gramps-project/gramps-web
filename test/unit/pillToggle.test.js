import {describe, it, expect} from 'vitest'
import {html, render} from 'lit'
import '../../src/components/GrampsjsPillToggle.js'

const icon = 'M0 0h24v24H0z'

const options = labels => labels.map(label => ({value: label, label, icon}))

async function renderToggle({iconsOnlyNarrow = true} = {}) {
  const container = document.createElement('div')
  document.body.append(container)
  render(
    html`<grampsjs-pill-toggle
      ?icons-only-narrow=${iconsOnlyNarrow}
      .options=${options(['Ancestors', 'Descendants'])}
    ></grampsjs-pill-toggle>`,
    container
  )
  const toggle = container.querySelector('grampsjs-pill-toggle')
  await toggle.updateComplete
  return toggle
}

// The test DOM has no layout, so the widths are set by hand
function setWidths(toggle, {available, options: width}) {
  Object.defineProperty(toggle, 'clientWidth', {
    configurable: true,
    value: available,
  })
  Object.defineProperty(
    toggle.renderRoot.querySelector('.container'),
    'offsetWidth',
    {configurable: true, value: width}
  )
}

const isCompact = toggle =>
  toggle.renderRoot.querySelector('.container').classList.contains('compact')

describe('GrampsjsPillToggle', () => {
  it('shows only icons while the options do not fit with their labels', async () => {
    const toggle = await renderToggle()
    setWidths(toggle, {available: 600, options: 800})
    toggle._updateCompact()
    await toggle.updateComplete
    expect(isCompact(toggle)).toBe(true)
    // The width of the options with labels is kept while only icons show
    setWidths(toggle, {available: 700, options: 300})
    toggle._updateCompact()
    await toggle.updateComplete
    expect(isCompact(toggle)).toBe(true)
    setWidths(toggle, {available: 1000, options: 300})
    toggle._updateCompact()
    await toggle.updateComplete
    expect(isCompact(toggle)).toBe(false)
  })

  it('measures again when the labels change', async () => {
    const toggle = await renderToggle()
    setWidths(toggle, {available: 600, options: 800})
    toggle._updateCompact()
    await toggle.updateComplete
    expect(isCompact(toggle)).toBe(true)
    setWidths(toggle, {available: 600, options: 500})
    toggle.options = options(['A', 'D'])
    await toggle.updateComplete
    await toggle.updateComplete
    expect(isCompact(toggle)).toBe(false)
  })

  it('keeps the labels without icons-only-narrow', async () => {
    const toggle = await renderToggle({iconsOnlyNarrow: false})
    setWidths(toggle, {available: 600, options: 800})
    toggle._updateCompact()
    await toggle.updateComplete
    expect(isCompact(toggle)).toBe(false)
  })
})
