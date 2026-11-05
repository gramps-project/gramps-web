import {describe, it, expect} from 'vitest'
import {GrampsjsAppStateMixin} from '../../src/mixins/GrampsjsAppStateMixin.js'
import {contextKey, grampsStrings} from '../../src/strings.js'

const Translatable = GrampsjsAppStateMixin(class {})

function withStrings(strings) {
  const element = new Translatable()
  element.appState = {i18n: {strings}}
  return element
}

describe('_p', () => {
  it('uses the translation with the context', () => {
    const element = withStrings({
      [contextKey('calendar', 'Gregorian')]: 'Gregorianisch',
    })
    expect(element._p('calendar', 'Gregorian')).toBe('Gregorianisch')
  })

  it('falls back to the translation without context', () => {
    const element = withStrings({Hebrew: 'Hebräisch'})
    expect(element._p('calendar', 'Hebrew')).toBe('Hebräisch')
  })

  it('falls back to the string itself', () => {
    expect(withStrings({})._p('calendar', 'Julian')).toBe('Julian')
  })

  it('replaces arguments', () => {
    const element = withStrings({[contextKey('ctx', 'Page %s')]: 'Seite %s'})
    expect(element._p('ctx', 'Page %s', 3)).toBe('Seite 3')
  })
})

describe('contextKey', () => {
  it('joins context and message with the gettext separator', () => {
    expect(contextKey('calendar', 'Julian')).toBe('calendar\u0004Julian')
  })

  it('is used for the calendar names', () => {
    expect(grampsStrings).toContain(contextKey('calendar', 'Gregorian'))
    expect(grampsStrings).not.toContain('Gregorian')
  })
})
