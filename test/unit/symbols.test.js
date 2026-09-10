import {describe, it, expect} from 'vitest'
import {
  getSymbols,
  SYMBOL_SET_DEFAULT,
  SYMBOL_SET_TEXT,
  SYMBOL_SET_OPTIONS,
} from '../../src/symbols.js'

describe('getSymbols', () => {
  it('returns the default unicode symbols when settings is undefined', () => {
    expect(getSymbols(undefined)).toEqual({
      birthSymbol: '∗',
      deathSymbol: '†',
      marriageSymbol: '⚭',
      divorceSymbol: '⚮',
    })
  })

  it('returns the default unicode symbols when symbolSet is not set', () => {
    expect(getSymbols({})).toEqual(getSymbols({symbolSet: SYMBOL_SET_DEFAULT}))
  })

  it('returns text abbreviations for the "text" set', () => {
    expect(getSymbols({symbolSet: SYMBOL_SET_TEXT})).toEqual({
      birthSymbol: 'b.',
      deathSymbol: 'd.',
      marriageSymbol: 'm.',
      divorceSymbol: 'div.',
    })
  })

  it('translates text abbreviations when a translator is provided', () => {
    const translations = {
      'b.': 'geb.',
      'd.': 'gest.',
      'm.': 'verh.',
      'div.': 'gesch.',
    }
    expect(
      getSymbols({symbolSet: SYMBOL_SET_TEXT}, value => translations[value])
    ).toEqual({
      birthSymbol: 'geb.',
      deathSymbol: 'gest.',
      marriageSymbol: 'verh.',
      divorceSymbol: 'gesch.',
    })
  })

  it('falls back to the default set for an unknown symbolSet', () => {
    expect(getSymbols({symbolSet: 'nonsense'})).toEqual(
      getSymbols({symbolSet: SYMBOL_SET_DEFAULT})
    )
  })
})

describe('SYMBOL_SET_OPTIONS', () => {
  it('has one option per symbol set, with a matching getSymbols() result', () => {
    SYMBOL_SET_OPTIONS.forEach(({value}) => {
      expect(getSymbols({symbolSet: value})).toBeTruthy()
    })
  })
})
