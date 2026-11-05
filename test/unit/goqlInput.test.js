import {describe, it, expect, afterEach} from 'vitest'

// The Material text field calls attachInternals(), which happy-dom does not
// implement.
if (!HTMLElement.prototype.attachInternals) {
  HTMLElement.prototype.attachInternals = function attachInternals() {
    return {setFormValue() {}, setValidity() {}}
  }
}

await import('../../src/components/GrampsjsGoqlInput.js')

async function mount(props = {}) {
  const el = document.createElement('grampsjs-goql-input')
  Object.assign(el, props)
  document.body.append(el)
  await el.updateComplete
  return el
}

const highlighted = el =>
  [...el.renderRoot.querySelectorAll('.goql-highlight span span')].map(span => [
    span.className,
    span.textContent,
  ])

describe('GrampsjsGoqlInput', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('stacks the highlight with the native input', async () => {
    const el = await mount({value: 'a == "x"'})
    const stack = el.renderRoot.querySelector('.goql-stack')
    expect(stack.querySelector('input.input')).not.toBeNull()
    expect(highlighted(el)).toEqual([
      ['variable', 'a'],
      ['whitespace', ' '],
      ['operator', '=='],
      ['whitespace', ' '],
      ['string', '"x"'],
    ])
  })

  it('highlights typed text and lets the input event bubble', async () => {
    const el = await mount()
    let bubbled = false
    document.body.addEventListener('input', () => {
      bubbled = true
    })
    const input = el.renderRoot.querySelector('.input')
    input.value = 'b != y'
    input.dispatchEvent(new Event('input', {bubbles: true, composed: true}))
    await el.updateComplete
    expect(el.value).toBe('b != y')
    expect(bubbled).toBe(true)
    expect(
      highlighted(el)
        .map(([, text]) => text)
        .join('')
    ).toBe('b != y')
  })

  it('turns off spell checking on the input', async () => {
    const el = await mount()
    expect(el.renderRoot.querySelector('.input').spellcheck).toBe(false)
  })
})
