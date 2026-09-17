import {charLength} from '../charUtils.js'

export const HIGHLIGHT_COLOR = '#FFFF00'
const LINK_PROTOCOLS = ['http:', 'https:', 'mailto:']

// Double markers come first so that `**bold**` is not read as `*italic*`
const DELIMITERS = [
  {marker: '**', name: 'bold'},
  {marker: '__', name: 'bold'},
  {marker: '~~', name: 'strikethrough'},
  {marker: '==', name: 'highlight', value: HIGHLIGHT_COLOR},
  {marker: '*', name: 'italic'},
  {marker: '_', name: 'italic'},
]

const isWordChar = ch => ch !== undefined && /[\p{L}\p{N}]/u.test(ch)
const isSpace = ch => ch !== undefined && /\s/.test(ch)

function parseUrl(str, protocols) {
  try {
    const url = new URL(str)
    return protocols.includes(url.protocol) ? url : null
  } catch {
    return null
  }
}

/**
 * Match `**text**`, `_text_` etc. closing at the end of `before`.
 *
 * Markers must hug their content, and the opening marker must not follow a
 * letter or digit. This keeps genealogical birth marks (`*1850 … *1852`),
 * snake_case words and arithmetic literal.
 */
function matchDelimiter(before, next, {marker, name, value = null}) {
  if (!before.endsWith(marker)) return null
  const m = marker[0]
  const len = marker.length
  const closeAt = before.length - len
  const last = before[closeAt - 1]
  if (last === undefined || last === m || isSpace(last)) return null
  if (next === m || isWordChar(next)) return null

  const openEnd = before.lastIndexOf(m, closeAt - 1) + 1
  const openAt = openEnd - len
  if (openEnd === 0 || openAt < 0) return null
  if (before.slice(openAt, openEnd) !== marker) return null
  const prev = before[openAt - 1]
  if (prev === m || prev === '\\' || isWordChar(prev)) return null
  if (isSpace(before[openEnd])) return null
  // don't format inside URLs such as https://example.org/_a_
  if (before.slice(0, openAt).split(/\s/).pop().includes('://')) return null

  return {
    removals: [
      [openAt, openEnd],
      [closeAt, before.length],
    ],
    content: [openEnd, closeAt],
    tag: {name, value},
  }
}

// [text](https://…)
function matchMarkdownLink(before) {
  const match = /\[([^[\]\n]+)\]\(([^()\s]+)\)$/.exec(before)
  if (!match) return null
  const {index} = match
  if (['!', '['].includes(before[index - 1])) return null
  const url = parseUrl(match[2], LINK_PROTOCOLS)
  if (!url) return null
  const labelEnd = index + 1 + match[1].length
  return {
    removals: [
      [index, index + 1],
      [labelEnd, before.length],
    ],
    content: [index + 1, labelEnd],
    tag: {name: 'link', value: url.href},
  }
}

// [[Name]] or [[Name|shown text]]
function matchWikilink(before) {
  const match = /\[\[([^[\]|\n]+)(?:\|([^[\]|\n]+))?\]\]$/.exec(before)
  if (!match) return null
  const [, target, alias] = match
  if (!target.trim() || (alias !== undefined && !alias.trim())) return null
  const {index} = match
  const labelStart = index + 2 + (alias === undefined ? 0 : target.length + 1)
  return {
    removals: [
      [index, labelStart],
      [before.length - 2, before.length],
    ],
    content: [labelStart, before.length - 2],
    tag: null,
    query: target.trim(),
  }
}

// a bare https://… URL, completed by typing whitespace
function matchBareUrl(before) {
  if (!isSpace(before[before.length - 1])) return null
  const text = before.slice(0, -1)
  const match = /(https?:\/\/\S+)$/.exec(text)
  if (!match) return null
  const {index} = match
  const prev = text[index - 1]
  if (prev !== undefined && !isSpace(prev) && prev !== '(') return null
  const raw = match[1].replace(/[.,;:!?)\]'"]+$/, '')
  const url = parseUrl(raw, ['http:', 'https:'])
  if (!url) return null
  return {
    removals: [],
    content: [index, index + raw.length],
    tag: {name: 'link', value: url.href},
  }
}

/**
 * Check whether the character just typed before `cursor` completes a
 * Markdown-style input rule on the current line.
 *
 * All positions are Unicode code-point offsets into `text`.
 *
 * @param {string} text - the full note string, including the typed character
 * @param {number} cursor - position directly after the typed character
 * @returns {null | {
 *   removals: number[][],
 *   range: number[],
 *   tag: {name: string, value: string|null} | null,
 *   query?: string
 * }} `removals` are marker ranges to delete, in ascending order and all before
 *   `cursor`. `range` is the formatted text after those deletions. `query` is
 *   set for `[[…]]` links, whose target the user still has to pick.
 */
export function matchInputRule(text, cursor) {
  if (cursor < 1) return null
  const chars = Array.from(text)
  if (cursor > chars.length) return null
  // the typed character itself may be a newline, so start looking before it
  const lineStart = chars.lastIndexOf('\n', cursor - 2) + 1
  const before = chars.slice(lineStart, cursor).join('')
  const next = chars[cursor]

  let match =
    matchBareUrl(before) || matchWikilink(before) || matchMarkdownLink(before)
  for (const delimiter of DELIMITERS) {
    if (match) break
    match = matchDelimiter(before, next, delimiter)
  }
  if (!match) return null

  const toChar = i => lineStart + charLength(before.slice(0, i))
  const removals = match.removals.map(([s, e]) => [toChar(s), toChar(e)])
  const [contentStart, contentEnd] = match.content.map(toChar)
  const removedBefore = removals
    .filter(([, e]) => e <= contentStart)
    .reduce((n, [s, e]) => n + e - s, 0)
  const start = contentStart - removedBefore
  return {
    removals,
    range: [start, start + contentEnd - contentStart],
    tag: match.tag,
    ...(match.query === undefined ? {} : {query: match.query}),
  }
}
