import {describe, it, expect} from 'vitest'
import {render} from 'lit'
import {renderPersonDates} from '../../src/components/personListUtils.js'

const renderText = result => {
  const div = document.createElement('div')
  render(result, div)
  return div.textContent
}

describe('renderPersonDates', () => {
  it('formats birth and death in the supplied locale (de)', () => {
    const text = renderText(
      renderPersonDates(
        {birth: {date: '1899-11-20'}, death: {date: '1900-01-15'}},
        {locale: 'de'}
      )
    )
    expect(text).to.include('∗')
    expect(text).to.match(/20\..*11\..*1899/)
    expect(text).to.include('†')
    expect(text).to.match(/15\..*01\..*1900/)
  })

  it('formats only the birth date when no death', () => {
    const text = renderText(
      renderPersonDates({birth: {date: '1899-11-20'}}, {locale: 'de'})
    )
    expect(text).to.match(/20\..*11\..*1899/)
    expect(text).not.to.include('†')
  })

  it('formats only the death date when no birth', () => {
    const text = renderText(
      renderPersonDates({death: {date: '1900-01-15'}}, {locale: 'de'})
    )
    expect(text).to.match(/15\..*01\..*1900/)
    expect(text).not.to.include('∗')
  })

  it('returns empty when no dates', () => {
    expect(renderText(renderPersonDates({}, {locale: 'de'}))).to.equal('')
    expect(renderText(renderPersonDates({}, {locale: 'de'}))).to.not.include(
      '∗'
    )
  })

  it('passes non-ISO date strings through unchanged (modifier)', () => {
    const text = renderText(
      renderPersonDates(
        {birth: {date: 'before 1899'}, death: {date: 'about 1900'}},
        {locale: 'de'}
      )
    )
    expect(text).to.include('before 1899')
    expect(text).to.include('about 1900')
  })

  it('falls back to en when locale is omitted (backward compat)', () => {
    const text = renderText(
      renderPersonDates({
        birth: {date: '1899-11-20'},
        death: {date: '1900-01-15'},
      })
    )
    expect(text).to.match(/11\/20\/1899/)
    expect(text).to.match(/1\/15\/1900/)
  })

  it('hides the age suffix when showAge is false', () => {
    const text = renderText(
      renderPersonDates(
        {birth: {date: '1899-11-20'}, death: {date: '1900-01-15', age: '51'}},
        {locale: 'de', showAge: false}
      )
    )
    expect(text).not.to.include('51')
  })

  it('shows the age when showAge is true and age is set', () => {
    const text = renderText(
      renderPersonDates(
        {birth: {date: '1899-11-20'}, death: {date: '1900-01-15', age: '51'}},
        {locale: 'de'}
      )
    )
    expect(text).to.include('(51)')
  })
})
