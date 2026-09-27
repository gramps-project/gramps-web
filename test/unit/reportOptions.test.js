import {describe, it, expect} from 'vitest'
import '../../src/components/GrampsjsReportOptions.js'

const optionsDict = {
  compress_tree: true,
  inc_border: false,
  center_uses: 0,
  off: 'print',
  papers: 'Letter',
  maxgen: 10,
  father_disp: ['$n', 'b. $b'],
  undocumented: 'x',
  of: 'Ancestor Tree',
}

const optionsHelp = {
  compress_tree: ['', 'Compress', ['False', 'True']],
  inc_border: ['', 'Border', ['True', 'False']],
  center_uses: [
    '',
    'Center',
    ['1\tUse Mothers display format', '0\tUse Fathers Display format'],
  ],
  off: ['=format', 'Output file format.', ['odt\tODT', 'pdf\tPDF', 'svg\tSVG']],
  papers: ['=name', 'Paper size name.', ['Letter', 'A4']],
  maxgen: ['', 'Generations', 'A number'],
  father_disp: ['', 'Father', 'A list of text values.'],
  of: ['=filename', 'Output file name.', '/data/whatever_name'],
}

function makeElement() {
  const el = document.createElement('grampsjs-report-options')
  el.optionsDict = optionsDict
  el.optionsHelp = structuredClone(optionsHelp)
  return el
}

describe('report option defaults', () => {
  it('reads JSON booleans as switch values', () => {
    const el = makeElement()
    expect(el._defaultValue('compress_tree')).to.equal('True')
    expect(el._defaultValue('inc_border')).to.equal('False')
  })

  it('treats a boolean option as boolean in either order', () => {
    const el = makeElement()
    expect(el._optionType('inc_border')).to.equal('boolean')
  })

  it('does not reorder select choices', () => {
    const el = makeElement()
    el._optionType('center_uses')
    el._optionType('inc_border')
    expect(el.optionsHelp.center_uses[2][0]).to.match(/^1\t/)
    expect(el.optionsHelp.inc_border[2]).to.deep.equal(['True', 'False'])
  })

  it('keeps a select default that is among the choices', () => {
    const el = makeElement()
    expect(el._defaultValue('center_uses')).to.equal('0')
    expect(el._defaultValue('papers')).to.equal('Letter')
  })

  it('falls back to PDF when the default format is not a choice', () => {
    const el = makeElement()
    expect(el._defaultValue('off')).to.equal('pdf')
  })

  it('falls back to the first choice without PDF', () => {
    const el = makeElement()
    el.optionsDict = {...optionsDict, papers: 'Tabloid'}
    expect(el._defaultValue('papers')).to.equal('Letter')
  })

  it('defaults the translation to the UI language', () => {
    const el = makeElement()
    el.optionsDict = {...optionsDict, trans: 'default'}
    el.optionsHelp.trans = [
      '',
      'Translation',
      ['default\tDefault', 'de\tGerman', 'pt_BR\tPortuguese (Brazil)'],
    ]
    el.appState = {i18n: {lang: 'pt_BR', strings: {}}}
    expect(el._defaultValue('trans')).to.equal('pt_BR')
    el.appState = {i18n: {lang: 'de_AT', strings: {}}}
    expect(el._defaultValue('trans')).to.equal('de')
    el.appState = {i18n: {lang: 'fi', strings: {}}}
    expect(el._defaultValue('trans')).to.equal('default')
  })

  it('keeps an explicit translation default', () => {
    const el = makeElement()
    el.optionsDict = {...optionsDict, trans: 'pt_BR'}
    el.optionsHelp.trans = [
      '',
      'Translation',
      ['default\tDefault', 'de\tGerman', 'pt_BR\tPortuguese (Brazil)'],
    ]
    el.appState = {i18n: {lang: 'de', strings: {}}}
    expect(el._defaultValue('trans')).to.equal('pt_BR')
  })

  it('encodes string and list defaults as strings', () => {
    const el = makeElement()
    expect(el._defaultValue('maxgen')).to.equal('10')
    expect(el._defaultValue('father_disp')).to.equal('["$n","b. $b"]')
  })

  it('handles options without a help entry', () => {
    const el = makeElement()
    expect(el._optionType('undocumented')).to.equal('string')
    expect(el._label('undocumented')).to.equal('undocumented')
    expect(el._defaultValue('undocumented')).to.equal('x')
  })

  it('populates every shown option and skips forbidden ones', () => {
    const el = makeElement()
    el.willUpdate(new Map([['optionsDict', {}]]))
    expect(Object.keys(el._options)).to.not.include('of')
    expect(el._options).to.include({
      compress_tree: 'True',
      off: 'pdf',
      center_uses: '0',
      undocumented: 'x',
    })
  })
})
