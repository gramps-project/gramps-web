/*
Mapping between Gramps Date objects and the state of the date editor.

The editor offers six kinds of date. Five map to one modifier each; the
"fromto" kind covers the Gramps modifiers from (7), to (8) and span (5), and
which of them a date gets follows from which of its two rows are filled in.

Each row is [day, month, year, dualDated], the layout of one half of a Gramps
dateval.
*/

import {CALENDARS, validateGrampsDate} from './gcalendar.js'

export const DATE_KINDS = [
  'regular',
  'about',
  'before',
  'after',
  'range',
  'fromto',
]

const KIND_MODIFIER = {
  regular: 0,
  before: 1,
  after: 2,
  about: 3,
  range: 4,
}

const MODIFIER_KIND = {
  0: 'regular',
  1: 'before',
  2: 'after',
  3: 'about',
  4: 'range',
  5: 'fromto',
  7: 'fromto',
  8: 'fromto',
}

const EMPTY_ROW = [0, 0, 0, false]

export function rowIsEmpty(row) {
  return row[0] === 0 && row[1] === 0 && row[2] === 0
}

/**
 * Split a Gramps date into the editor kind and its two rows.
 *
 * A "to" date keeps its single date in the second row, so it shows next to
 * the "To" label. Text-only and unknown modifiers give the kind `null`.
 */
export function dateToEditorState(date) {
  const dv = date?.dateval ?? []
  const first = [dv[0] ?? 0, dv[1] ?? 0, dv[2] ?? 0, dv[3] ?? false]
  const second = dv.length >= 8 ? dv.slice(4, 8) : [...EMPTY_ROW]
  const modifier = date?.modifier ?? 0
  const kind = MODIFIER_KIND[modifier] ?? null
  const rows = modifier === 8 ? [[...EMPTY_ROW], first] : [first, second]
  return {kind, rows}
}

/**
 * Build the Gramps date for an editor kind and its rows, keeping all other
 * properties of `base`. A date whose rows in use are all empty becomes an
 * empty regular date, so an untouched field saves nothing.
 */
export function editorStateToDate(base, kind, rows) {
  if (kind === null) {
    return base
  }
  const [first, second] = rows
  let modifier
  let dateval
  if (kind === 'fromto') {
    if (!rowIsEmpty(first) && !rowIsEmpty(second)) {
      modifier = 5
      dateval = [...first, ...second]
    } else if (!rowIsEmpty(second)) {
      modifier = 8
      dateval = [...second]
    } else {
      modifier = 7
      dateval = [...first]
    }
  } else if (kind === 'range') {
    modifier = 4
    dateval = [...first, ...second]
  } else {
    modifier = KIND_MODIFIER[kind]
    dateval = [...first]
  }
  const usedRows = kind === 'range' || kind === 'fromto' ? rows : [first]
  if (usedRows.every(rowIsEmpty)) {
    modifier = 0
    dateval = [...EMPTY_ROW]
  }
  return {...base, modifier, dateval}
}

export function kindHasTwoRows(kind) {
  return kind === 'range' || kind === 'fromto'
}

/**
 * The rows to use after switching from one kind to another. When a kind
 * with two rows has only its second row filled in, as a "to" date does, a
 * kind with one row takes that date over. The rows are swapped, so the
 * returned array differs from `rows` exactly when that happens.
 */
export function rowsAfterKindSwitch(fromKind, toKind, rows) {
  if (
    kindHasTwoRows(fromKind) &&
    !kindHasTwoRows(toKind) &&
    rowIsEmpty(rows[0]) &&
    !rowIsEmpty(rows[1])
  ) {
    return [rows[1], rows[0]]
  }
  return rows
}

/**
 * The number in a date field. An empty field is 0, meaning unspecified;
 * input the browser could not read as a number (`badInput`), or that is not
 * a whole number, is NaN, which validation reports as an error. Negative
 * years are BC dates.
 */
export function parseDateField(value, badInput = false) {
  if (badInput) {
    return NaN
  }
  if (value === '') {
    return 0
  }
  const n = Number(value)
  return Number.isInteger(n) ? n : NaN
}

function maxMonth(calendar) {
  return calendar === CALENDARS.FRENCH || calendar === CALENDARS.HEBREW
    ? 13
    : 12
}

function rowOutOfRange(row, calendar) {
  const [d, m, y] = row
  return (
    ![d, m, y].every(Number.isInteger) ||
    d < 0 ||
    d > 31 ||
    m < 0 ||
    m > maxMonth(calendar)
  )
}

/**
 * Validate the editor state. Returns whether the date is valid and, for each
 * row, whether it should be marked as an error.
 */
export function validateEditorState(date, kind, rows) {
  const calendar = date?.calendar ?? CALENDARS.GREGORIAN
  const result = validateGrampsDate(date)
  const rowErrors = [false, false]
  if (date?.modifier === 8) {
    rowErrors[1] = result.date1Invalid
  } else {
    rowErrors[0] = result.date1Invalid
    rowErrors[1] =
      result.date2Empty || result.date2Invalid || result.date2OrderInvalid
  }
  const shown = kindHasTwoRows(kind) ? [0, 1] : [0]
  const outOfRange = shown.filter(i => rowOutOfRange(rows[i], calendar))
  outOfRange.forEach(i => {
    rowErrors[i] = true
  })
  // A range needs its start; only a span may leave one end open
  const rangeWithoutStart =
    kind === 'range' && rowIsEmpty(rows[0]) && !rowIsEmpty(rows[1])
  if (rangeWithoutStart) {
    rowErrors[0] = true
  }
  return {
    rowErrors: rowErrors.map((error, i) => error && shown.includes(i)),
    valid: result.valid && outOfRange.length === 0 && !rangeWithoutStart,
  }
}
