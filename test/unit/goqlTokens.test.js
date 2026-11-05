import {describe, it, expect} from 'vitest'
import {tokenizeGoql} from '../../src/goqlTokens.js'

const types = text =>
  tokenizeGoql(text)
    .filter(t => t.type !== 'whitespace')
    .map(t => [t.type, t.text])

describe('tokenizeGoql', () => {
  it('returns no tokens for an empty string', () => {
    expect(tokenizeGoql('')).toEqual([])
  })

  it('classifies a comparison on a path', () => {
    expect(types('primary_name.surname_list[0].surname == "Smith"')).toEqual([
      ['variable', 'primary_name'],
      ['punctuation', '.'],
      ['variable', 'surname_list'],
      ['bracket', '['],
      ['number', '0'],
      ['bracket', ']'],
      ['punctuation', '.'],
      ['variable', 'surname'],
      ['operator', '=='],
      ['string', '"Smith"'],
    ])
  })

  it('recognizes all comparison operators', () => {
    ;['==', '!=', '<', '<=', '>', '>='].forEach(op => {
      expect(types(`a ${op} 1`)[1]).toEqual(['operator', op])
    })
  })

  it('leaves operators GOQL does not know as plain text', () => {
    expect(types('a = 1')[1]).toEqual(['plain', '='])
    expect(types('a ~ 1')[1]).toEqual(['plain', '~'])
  })

  it('recognizes keywords, also in "not in" and "is not"', () => {
    expect(types('not a and b or c')).toEqual([
      ['keyword', 'not'],
      ['variable', 'a'],
      ['keyword', 'and'],
      ['variable', 'b'],
      ['keyword', 'or'],
      ['variable', 'c'],
    ])
    expect(types('a not in [1, 2]').slice(1, 3)).toEqual([
      ['keyword', 'not'],
      ['keyword', 'in'],
    ])
    expect(types('a is not None')).toEqual([
      ['variable', 'a'],
      ['keyword', 'is'],
      ['keyword', 'not'],
      ['constant', 'None'],
    ])
  })

  it('is case-sensitive like Python', () => {
    expect(types('a AND b')[1]).toEqual(['variable', 'AND'])
    expect(types('true')[0]).toEqual(['variable', 'true'])
  })

  it('recognizes strings including escapes, raw and unterminated ones', () => {
    expect(types('"a \\" b"')).toEqual([['string', '"a \\" b"']])
    expect(types("'x'")).toEqual([['string', "'x'"]])
    expect(types("r'^A.*'")).toEqual([['string', "r'^A.*'"]])
    expect(types('a == "open')[2]).toEqual(['string', '"open'])
  })

  it('recognizes numbers and negative numbers', () => {
    expect(types('a > 1.5e3')[2]).toEqual(['number', '1.5e3'])
    expect(types('a > -2').slice(1)).toEqual([
      ['operator', '>'],
      ['operator', '-'],
      ['number', '2'],
    ])
  })

  it('recognizes function calls', () => {
    expect(types('like(a, "x%")')[0]).toEqual(['function', 'like'])
    expect(types("b > Date ('Jan 1, 1968')")[2]).toEqual(['function', 'Date'])
    expect(types('len(event_ref_list) > 2')[0]).toEqual(['function', 'len'])
  })

  it('recognizes class constants', () => {
    expect(types('gender == Person.MALE').slice(2)).toEqual([
      ['type', 'Person'],
      ['punctuation', '.'],
      ['enum', 'MALE'],
    ])
    expect(types('a.MALE')[2]).toEqual(['variable', 'MALE'])
    expect(types('father.surname')[0]).toEqual(['variable', 'father'])
  })

  it('treats keywords after a dot as fields', () => {
    expect(types('a.in')[2]).toEqual(['variable', 'in'])
  })

  it('recognizes comprehensions', () => {
    expect(types('any(c.private for c in children if c.gender == 1)')).toEqual([
      ['function', 'any'],
      ['bracket', '('],
      ['variable', 'c'],
      ['punctuation', '.'],
      ['variable', 'private'],
      ['control', 'for'],
      ['variable', 'c'],
      ['keyword', 'in'],
      ['variable', 'children'],
      ['control', 'if'],
      ['variable', 'c'],
      ['punctuation', '.'],
      ['variable', 'gender'],
      ['operator', '=='],
      ['number', '1'],
      ['bracket', ')'],
    ])
  })

  it('gives brackets their nesting depth', () => {
    const brackets = tokenizeGoql('(a in [1, (2)]) or b')
      .filter(t => t.type === 'bracket')
      .map(t => [t.text, t.depth])
    expect(brackets).toEqual([
      ['(', 0],
      ['[', 1],
      ['(', 2],
      [')', 2],
      [']', 1],
      [')', 0],
    ])
  })

  it('leaves unmatched closing brackets as plain text', () => {
    expect(types('a) ]')).toEqual([
      ['variable', 'a'],
      ['plain', ')'],
      ['plain', ']'],
    ])
    expect(types('(a]')[2]).toEqual(['plain', ']'])
  })

  it('keeps unknown characters and round-trips the input', () => {
    const text = 'a == "b" ? Müller & (c'
    const tokens = tokenizeGoql(text)
    expect(tokens.map(t => t.text).join('')).toBe(text)
    expect(types(text)).toContainEqual(['variable', 'Müller'])
    expect(types(text)).toContainEqual(['plain', '?'])
  })
})
