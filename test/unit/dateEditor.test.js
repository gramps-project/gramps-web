import {describe, it, expect} from 'vitest'
import {
  dateToEditorState,
  editorStateToDate,
  parseDateField,
  rowsAfterKindSwitch,
  validateEditorState,
} from '../../src/dateEditor.js'
import {emptyDate} from '../../src/util.js'

const EMPTY = [0, 0, 0, false]

function date(modifier, dateval, extra = {}) {
  return {...emptyDate, modifier, dateval, ...extra}
}

describe('dateToEditorState', () => {
  it('maps single-date modifiers to their kinds', () => {
    expect(dateToEditorState(date(0, [12, 3, 1850, false])).kind).toBe(
      'regular'
    )
    expect(dateToEditorState(date(1, [0, 0, 1850, false])).kind).toBe('before')
    expect(dateToEditorState(date(2, [0, 0, 1850, false])).kind).toBe('after')
    expect(dateToEditorState(date(3, [0, 0, 1850, false])).kind).toBe('about')
  })

  it('reads both rows of a range', () => {
    const state = dateToEditorState(
      date(4, [0, 0, 1850, false, 0, 0, 1860, false])
    )
    expect(state.kind).toBe('range')
    expect(state.rows).toEqual([
      [0, 0, 1850, false],
      [0, 0, 1860, false],
    ])
  })

  it('maps from, to and span to the from-to kind', () => {
    expect(dateToEditorState(date(7, [0, 0, 1850, false]))).toEqual({
      kind: 'fromto',
      rows: [[0, 0, 1850, false], EMPTY],
    })
    expect(dateToEditorState(date(8, [0, 0, 1860, false]))).toEqual({
      kind: 'fromto',
      rows: [EMPTY, [0, 0, 1860, false]],
    })
    expect(
      dateToEditorState(date(5, [0, 0, 1850, false, 0, 0, 1860, false]))
    ).toEqual({
      kind: 'fromto',
      rows: [
        [0, 0, 1850, false],
        [0, 0, 1860, false],
      ],
    })
  })

  it('gives no kind for a text-only date', () => {
    expect(dateToEditorState(date(6, EMPTY, {text: 'sometime'})).kind).toBe(
      null
    )
  })

  it('handles a missing date', () => {
    expect(dateToEditorState(undefined)).toEqual({
      kind: 'regular',
      rows: [EMPTY, EMPTY],
    })
  })
})

describe('editorStateToDate', () => {
  const y1850 = [0, 0, 1850, false]
  const y1860 = [0, 0, 1860, false]

  it('uses only the first row for single-date kinds', () => {
    const result = editorStateToDate(emptyDate, 'about', [y1850, y1860])
    expect(result.modifier).toBe(3)
    expect(result.dateval).toEqual(y1850)
  })

  it('derives from, to and span from the filled-in rows', () => {
    expect(editorStateToDate(emptyDate, 'fromto', [y1850, EMPTY])).toEqual(
      date(7, y1850)
    )
    expect(editorStateToDate(emptyDate, 'fromto', [EMPTY, y1860])).toEqual(
      date(8, y1860)
    )
    expect(editorStateToDate(emptyDate, 'fromto', [y1850, y1860])).toEqual(
      date(5, [...y1850, ...y1860])
    )
  })

  it('keeps both rows of a range, even with an empty second row', () => {
    expect(editorStateToDate(emptyDate, 'range', [y1850, EMPTY])).toEqual(
      date(4, [...y1850, ...EMPTY])
    )
  })

  it('turns a date without any filled-in row into an empty date', () => {
    for (const kind of ['about', 'range', 'fromto']) {
      expect(editorStateToDate(emptyDate, kind, [EMPTY, EMPTY])).toEqual(
        emptyDate
      )
    }
  })

  it('keeps quality, calendar and other properties', () => {
    const base = {...emptyDate, quality: 1, calendar: 1, newyear: 3}
    const result = editorStateToDate(base, 'regular', [y1850, EMPTY])
    expect(result.quality).toBe(1)
    expect(result.calendar).toBe(1)
    expect(result.newyear).toBe(3)
  })

  it('leaves a text-only date untouched while no kind is chosen', () => {
    const base = date(6, EMPTY, {text: 'sometime'})
    expect(editorStateToDate(base, null, [EMPTY, EMPTY])).toBe(base)
  })

  it('round-trips every modifier the editor supports', () => {
    const dates = [
      date(0, [12, 3, 1850, false]),
      date(1, [0, 3, 1850, false]),
      date(2, [0, 0, 1850, true]),
      date(3, [1, 1, 1850, false]),
      date(4, [...y1850, ...y1860]),
      date(5, [...y1850, ...y1860]),
      date(7, y1850),
      date(8, y1860),
    ]
    for (const d of dates) {
      const {kind, rows} = dateToEditorState(d)
      expect(editorStateToDate(d, kind, rows)).toEqual(d)
    }
  })
})

describe('validateEditorState', () => {
  function check(kind, rows, base = emptyDate) {
    return validateEditorState(editorStateToDate(base, kind, rows), kind, rows)
  }

  it('accepts a valid date', () => {
    expect(check('regular', [[12, 3, 1850, false], EMPTY])).toEqual({
      rowErrors: [false, false],
      valid: true,
    })
  })

  it('rejects an impossible day', () => {
    expect(check('regular', [[31, 2, 1850, false], EMPTY])).toEqual({
      rowErrors: [true, false],
      valid: false,
    })
  })

  it('rejects out-of-range months and days, also without a day', () => {
    expect(check('regular', [[0, 13, 1850, false], EMPTY]).valid).toBe(false)
    expect(check('regular', [[32, 0, 1850, false], EMPTY]).valid).toBe(false)
  })

  it('accepts a thirteenth month in the French Republican calendar', () => {
    const base = {...emptyDate, calendar: 3}
    expect(check('regular', [[0, 13, 10, false], EMPTY], base).valid).toBe(true)
  })

  it('rejects text that is not a whole number', () => {
    expect(check('regular', [[0, 0, NaN, false], EMPTY])).toEqual({
      rowErrors: [true, false],
      valid: false,
    })
  })

  it('marks the second row of a range without an end', () => {
    expect(check('range', [[0, 0, 1850, false], EMPTY])).toEqual({
      rowErrors: [false, true],
      valid: false,
    })
  })

  it('marks the To row of an invalid "to" date', () => {
    expect(check('fromto', [EMPTY, [31, 2, 1860, false]])).toEqual({
      rowErrors: [false, true],
      valid: false,
    })
  })

  it('marks a span that ends before it starts', () => {
    expect(
      check('fromto', [
        [0, 0, 1860, false],
        [0, 0, 1850, false],
      ])
    ).toEqual({rowErrors: [false, true], valid: false})
  })

  it('ignores a hidden second row', () => {
    expect(
      check('regular', [
        [0, 0, 1850, false],
        [0, 99, 0, false],
      ])
    ).toEqual({rowErrors: [false, false], valid: true})
  })

  it('accepts BC dates', () => {
    expect(check('regular', [[15, 3, -44, false], EMPTY])).toEqual({
      rowErrors: [false, false],
      valid: true,
    })
  })

  it('marks the first row of a range without a start', () => {
    expect(check('range', [EMPTY, [0, 0, 1860, false]])).toEqual({
      rowErrors: [true, false],
      valid: false,
    })
  })

  it('accepts a span without a start', () => {
    expect(check('fromto', [EMPTY, [0, 0, 1860, false]])).toEqual({
      rowErrors: [false, false],
      valid: true,
    })
  })
})

describe('rowsAfterKindSwitch', () => {
  const y1850 = [0, 0, 1850, false]
  const y1860 = [0, 0, 1860, false]

  it('moves the date of a "to" date into the only row', () => {
    expect(rowsAfterKindSwitch('fromto', 'before', [EMPTY, y1860])).toEqual([
      y1860,
      EMPTY,
    ])
  })

  it('keeps the rows between kinds with one row', () => {
    // Range 1850-1860, switched to Regular, year cleared: About stays empty
    const rows = [EMPTY, y1860]
    expect(rowsAfterKindSwitch('regular', 'about', rows)).toBe(rows)
  })

  it('keeps the rows between kinds with two rows', () => {
    const rows = [EMPTY, y1860]
    expect(rowsAfterKindSwitch('fromto', 'range', rows)).toBe(rows)
  })

  it('keeps the rows when the first row is filled in', () => {
    const rows = [y1850, y1860]
    expect(rowsAfterKindSwitch('range', 'regular', rows)).toBe(rows)
  })

  it('keeps the rows of a text-only date', () => {
    const rows = [EMPTY, y1860]
    expect(rowsAfterKindSwitch(null, 'regular', rows)).toBe(rows)
  })
})

describe('parseDateField', () => {
  it('reads whole numbers, including negative years', () => {
    expect(parseDateField('1850')).toBe(1850)
    expect(parseDateField('-44')).toBe(-44)
  })

  it('treats an empty field as unspecified', () => {
    expect(parseDateField('')).toBe(0)
  })

  it('rejects input the browser could not read', () => {
    expect(parseDateField('', true)).toBeNaN()
  })

  it('rejects fractions', () => {
    expect(parseDateField('1.5')).toBeNaN()
  })
})
