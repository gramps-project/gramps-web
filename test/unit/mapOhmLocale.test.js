import {describe, it, expect} from 'vitest'
import {normalizeOhmLocale, OHM_LOCALE_MAP} from '../../src/util.js'

describe('normalizeOhmLocale', () => {
  describe('basic mapping', () => {
    it('maps base language codes to themselves', () => {
      expect(normalizeOhmLocale('de')).to.equal('de')
      expect(normalizeOhmLocale('en')).to.equal('en')
      expect(normalizeOhmLocale('fr')).to.equal('fr')
      expect(normalizeOhmLocale('es')).to.equal('es')
      expect(normalizeOhmLocale('it')).to.equal('it')
      expect(normalizeOhmLocale('pl')).to.equal('pl')
      expect(normalizeOhmLocale('ru')).to.equal('ru')
      expect(normalizeOhmLocale('ja')).to.equal('ja')
      expect(normalizeOhmLocale('zh')).to.equal('zh')
    })

    it('maps regional variants to base language codes', () => {
      expect(normalizeOhmLocale('de_AT')).to.equal('de')
      expect(normalizeOhmLocale('de_DE')).to.equal('de')
      expect(normalizeOhmLocale('en_GB')).to.equal('en')
      expect(normalizeOhmLocale('en_US')).to.equal('en')
      expect(normalizeOhmLocale('pt_BR')).to.equal('pt')
      expect(normalizeOhmLocale('pt_PT')).to.equal('pt')
      expect(normalizeOhmLocale('zh_CN')).to.equal('zh')
      expect(normalizeOhmLocale('zh_HK')).to.equal('zh')
      expect(normalizeOhmLocale('zh_TW')).to.equal('zh')
    })

    it('maps all supported frontend locales listed in OHM_LOCALE_MAP', () => {
      Object.entries(OHM_LOCALE_MAP).forEach(
        ([frontendLocale, expectedOhmLocale]) => {
          const result = normalizeOhmLocale(frontendLocale)
          expect(result).to.equal(expectedOhmLocale)
        }
      )
    })
  })

  describe('fallback behavior', () => {
    it('defaults to "en" when locale is undefined', () => {
      expect(normalizeOhmLocale(undefined)).to.equal('en')
    })

    it('defaults to "en" when locale is null', () => {
      expect(normalizeOhmLocale(null)).to.equal('en')
    })

    it('defaults to "en" when locale is empty string', () => {
      expect(normalizeOhmLocale('')).to.equal('en')
    })

    it('extracts base code from unknown regional variants', () => {
      expect(normalizeOhmLocale('xx_YY')).to.equal('xx')
      expect(normalizeOhmLocale('zz_XY')).to.equal('zz')
    })

    it('defaults to "en" when locale is completely unknown with no base code', () => {
      // Testing edge case with non-standard input
      expect(normalizeOhmLocale('_')).to.equal('en')
      expect(normalizeOhmLocale('')).to.equal('en')
    })
  })

  describe('edge cases', () => {
    it('handles locales with multiple underscores', () => {
      // Should extract the part before the first underscore
      expect(normalizeOhmLocale('sr__Latn')).to.equal('sr')
      expect(normalizeOhmLocale('xx_Y_Z')).to.equal('xx')
    })

    it('handles locales not in the map with regional suffix', () => {
      // If a locale isn't in the map but has a base code, use it
      expect(normalizeOhmLocale('xy_AB')).to.equal('xy')
    })
  })
})

describe('OHM_LOCALE_MAP', () => {
  it('contains entries for all frontendLanguages that need mapping', () => {
    const frontendLanguages = [
      'ar',
      'ba',
      'bg',
      'br',
      'ca',
      'cs',
      'da',
      'de_AT',
      'de',
      'el',
      'en_GB',
      'en',
      'eo',
      'es',
      'fi',
      'fr',
      'ga',
      'he',
      'hr',
      'hu',
      'is',
      'id',
      'it',
      'ja',
      'ko',
      'lt',
      'lv',
      'mk',
      'nb',
      'nl',
      'nn',
      'pl',
      'pt_BR',
      'pt_PT',
      'ro',
      'ru',
      'sk',
      'sl',
      'sq',
      'sr',
      'sv',
      'ta',
      'tr',
      'uk',
      'vi',
      'zh_CN',
      'zh_HK',
      'zh_TW',
    ]

    // All languages from frontendLanguages should either:
    // 1. Be in OHM_LOCALE_MAP with a mapping to base code
    // 2. Or map to themselves (base code = same code)
    frontendLanguages.forEach(lang => {
      const mapped = OHM_LOCALE_MAP[lang]
      expect(mapped).to.not.be.undefined
    })
  })

  it('maps all regional variants to their base language codes', () => {
    // Verify specific important mappings
    expect(OHM_LOCALE_MAP.de_AT).to.equal('de')
    expect(OHM_LOCALE_MAP.en_GB).to.equal('en')
    expect(OHM_LOCALE_MAP.pt_BR).to.equal('pt')
    expect(OHM_LOCALE_MAP.pt_PT).to.equal('pt')
    expect(OHM_LOCALE_MAP.zh_CN).to.equal('zh')
    expect(OHM_LOCALE_MAP.zh_HK).to.equal('zh')
    expect(OHM_LOCALE_MAP.zh_TW).to.equal('zh')
  })

  it('does not contain any entries that map to undefined', () => {
    Object.entries(OHM_LOCALE_MAP).forEach(([locale, mappedLocale]) => {
      expect(mappedLocale).to.be.a('string')
      expect(mappedLocale.length).to.be.greaterThan(0)
    })
  })
})
