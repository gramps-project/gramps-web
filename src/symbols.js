// src/symbols.js
export const SYMBOL_SET_DEFAULT = 'default'
export const SYMBOL_SET_TEXT = 'text'

export const SYMBOL_SETS = {
  [SYMBOL_SET_DEFAULT]: {
    birthSymbol: '*',
    deathSymbol: '†',
    marriageSymbol: '⚭',
    divorceSymbol: '⚮',
  },
  [SYMBOL_SET_TEXT]: {
    birthSymbol: 'b.',
    deathSymbol: 'd.',
    marriageSymbol: 'm.',
    divorceSymbol: 'div.',
  },
}

// Options for the <select> in user settings, labelled by the symbols themselves.
export const SYMBOL_SET_OPTIONS = [SYMBOL_SET_DEFAULT, SYMBOL_SET_TEXT]

const SYMBOL_TRANSLATION_CONTEXTS = {
  birthSymbol: 'birth abbreviation',
  deathSymbol: 'death abbreviation',
  marriageSymbol: 'marriage abbreviation',
  divorceSymbol: 'Divorce abbreviation',
}

export function getSymbols(settings, translate = value => value) {
  const symbols =
    SYMBOL_SETS[settings?.symbolSet] ?? SYMBOL_SETS[SYMBOL_SET_DEFAULT]
  return Object.fromEntries(
    Object.entries(symbols).map(([key, value]) => {
      const context =
        settings?.symbolSet === SYMBOL_SET_TEXT
          ? SYMBOL_TRANSLATION_CONTEXTS[key]
          : undefined
      if (!context) return [key, value]

      const translationKey = `${context}\u0004${value}`
      const translated = translate(translationKey)
      return [
        key,
        translated == null || translated === translationKey
          ? value
          : translated,
      ]
    })
  )
}

export function getSymbolSetLabel(symbolSet, translate) {
  return Object.values(getSymbols({symbolSet}, translate)).join(' ')
}
