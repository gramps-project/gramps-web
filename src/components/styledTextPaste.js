import {charLength} from '../charUtils.js'

const _SAFE_LINK_PROTOCOLS = ['http:', 'https:', 'mailto:', 'gramps:']
const _HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']

/**
 * Return the StyledText format objects contributed by a single HTML element.
 * Only structural/intentional formatting is mapped; ambient styles (color,
 * font-family, font-size) are intentionally ignored.
 *
 * @param {Element} node
 * @param {string} tag - lower-cased tag name
 * @returns {{name: string, value: string|null}[]}
 */
function _formatsForElement(node, tag) {
  const formats = []

  // Semantic elements
  if (tag === 'b' || tag === 'strong' || _HEADING_TAGS.includes(tag)) {
    formats.push({name: 'bold', value: null})
  } else if (tag === 'i' || tag === 'em') {
    formats.push({name: 'italic', value: null})
  } else if (tag === 'u') {
    formats.push({name: 'underline', value: null})
  } else if (tag === 's' || tag === 'del' || tag === 'strike') {
    formats.push({name: 'strikethrough', value: null})
  } else if (tag === 'sup') {
    formats.push({name: 'superscript', value: null})
  } else if (tag === 'a') {
    try {
      const rawHref = node.getAttribute('href') || ''
      const url = new URL(rawHref)
      if (_SAFE_LINK_PROTOCOLS.includes(url.protocol)) {
        // For gramps: links, preserve the raw href so that the capitalised
        // object-type segment (e.g. gramps://Person/handle/…) is not silently
        // lowercased by URL hostname normalisation. Quote characters are
        // stripped to prevent them breaking the <a href="…"> attribute.
        // For http/https/mailto, url.href (normalized/encoded) is used
        // instead — it encodes unsafe characters and is safe to embed.
        const value =
          url.protocol === 'gramps:' ? rawHref.replace(/['"]/g, '') : url.href
        formats.push({name: 'link', value})
      }
    } catch {
      // relative or malformed href — skip
    }
  }

  // CSS-based formatting — structural intent only (bold / italic / decoration).
  // Font family, size, color and highlight are NOT picked up here: they are
  // almost always ambient document styles, not intentional user formatting.
  const style = node.style || {}
  const fw = style.fontWeight
  const fwNum = parseInt(fw, 10)
  if (
    fw === 'bold' ||
    fw === 'bolder' ||
    (!Number.isNaN(fwNum) && fwNum >= 600)
  ) {
    formats.push({name: 'bold', value: null})
  }
  if (style.fontStyle === 'italic' || style.fontStyle === 'oblique') {
    formats.push({name: 'italic', value: null})
  }
  const td = style.textDecoration || style.textDecorationLine || ''
  if (td.includes('underline')) formats.push({name: 'underline', value: null})
  if (td.includes('line-through'))
    formats.push({name: 'strikethrough', value: null})

  return formats
}

/**
 * Parse a clipboard HTML string into a StyledText-compatible `{string, tags}`
 * object, preserving only what StyledText can represent.
 *
 * **Preserved:** bold, italic, underline, strikethrough, superscript, links.
 * **Block structure:** headings/paragraphs become blank-line separators; list
 * items become `• ` / `1. ` markers with two-space indentation per level.
 * **Dropped:** font family, color, size, highlight (ambient document styles).
 *
 * @param {string} html - raw HTML from the clipboard
 * @returns {{
 *   string: string,
 *   tags: Array<{name: string, value: string|null, ranges: number[][]}>
 * }}
 */
export function parseHtmlToStyledText(html) {
  // <template> is inert by spec — no network requests from <img src="…"> etc.
  const tmp = document.createElement('template')
  tmp.innerHTML = html

  let text = ''
  let textCpLen = 0 // running code-point length — avoids O(n²) charLength calls
  const segments = [] // {start, end, name, value} in code-point indices
  const listStack = [] // {type:'ol'|'ul', counter:number} — one entry per open list

  // ── Text-accumulation helpers ─────────────────────────────────────────────

  function append(str) {
    text += str
    textCpLen += charLength(str)
  }

  /** After a block element: ensure the text ends with \n\n (blank line). */
  function ensureDoubleNewline() {
    if (text.length === 0) return
    if (!text.endsWith('\n\n')) append(text.endsWith('\n') ? '\n' : '\n\n')
  }

  /** After an inline-block element (li, td): ensure the text ends with \n. */
  function ensureSingleNewline() {
    if (text.length > 0 && !text.endsWith('\n')) append('\n')
  }

  /** Before a list item's content: add \n if needed, then bullet/number. */
  function insertListMarker() {
    ensureSingleNewline()
    const depth = Math.max(0, listStack.length - 1)
    const indent = '  '.repeat(depth)
    const ctx = listStack[listStack.length - 1]
    if (ctx?.type === 'ol') {
      append(`${indent}${ctx.counter}. `)
      ctx.counter += 1
    } else {
      append(`${indent}• `)
    }
  }

  // ── Tree walker ───────────────────────────────────────────────────────────

  function walk(node, activeFormats, inPre) {
    // Text node: normalize whitespace (unless inside <pre>), record segments
    if (node.nodeType === Node.TEXT_NODE) {
      let nodeText = node.textContent
      if (!inPre) {
        nodeText = nodeText.replace(/[ \t\r\n]+/g, ' ')
        if (
          nodeText.startsWith(' ') &&
          (text.length === 0 || /[ \n]$/.test(text))
        ) {
          nodeText = nodeText.slice(1) // suppress redundant leading space
        }
      }
      if (nodeText.length === 0) return
      const start = textCpLen
      append(nodeText)
      activeFormats.forEach(fmt =>
        segments.push({start, end: textCpLen, name: fmt.name, value: fmt.value})
      )
      return
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return

    const tag = node.tagName.toLowerCase()
    if (tag === 'script' || tag === 'style') return
    if (tag === 'br') {
      const start = textCpLen
      append('\n')
      activeFormats.forEach(fmt =>
        segments.push({start, end: textCpLen, name: fmt.name, value: fmt.value})
      )
      return
    }

    const newFormats = [...activeFormats, ..._formatsForElement(node, tag)]
    const nextInPre =
      inPre ||
      tag === 'pre' ||
      ['pre', 'pre-wrap'].includes(node.style?.whiteSpace)

    const isHeading = _HEADING_TAGS.includes(tag)
    const isDoubleBreak =
      isHeading ||
      ['p', 'div', 'blockquote'].includes(tag) ||
      (['ul', 'ol'].includes(tag) && listStack.length === 0)
    const isSingleBreak = ['li', 'td', 'th'].includes(tag)

    if (isDoubleBreak) ensureDoubleNewline() // blank line before block
    if (tag === 'ol') listStack.push({type: 'ol', counter: 1})
    else if (tag === 'ul') listStack.push({type: 'ul'})
    else if (tag === 'li') insertListMarker()

    for (const child of node.childNodes) walk(child, newFormats, nextInPre)

    if (tag === 'ol' || tag === 'ul') listStack.pop()
    if (isDoubleBreak) ensureDoubleNewline() // blank line after block
    else if (isSingleBreak) ensureSingleNewline()
  }

  for (const child of tmp.content.childNodes) walk(child, [], false)

  // ── Post-processing ───────────────────────────────────────────────────────

  // Strip leading and trailing newlines; track how many were removed from the
  // front so tag ranges can be shifted accordingly.
  const leadNL = (text.match(/^\n*/) || [''])[0].length
  const stripped = text.slice(leadNL).replace(/\n+$/, '')
  const trimmedLen = charLength(stripped)

  // Group segments by (name, value) key, merge overlapping/adjacent ranges
  const tagMap = new Map()
  segments.forEach(({start, end, name, value}) => {
    const clampedStart = Math.max(0, start - leadNL)
    const clampedEnd = Math.min(end - leadNL, trimmedLen)
    if (clampedEnd <= clampedStart) return
    const key = `${name}\0${value ?? ''}`
    if (!tagMap.has(key)) tagMap.set(key, {name, value, ranges: []})
    tagMap.get(key).ranges.push([clampedStart, clampedEnd])
  })

  const tags = []
  tagMap.forEach(({name, value, ranges}) => {
    const merged = ranges
      .slice()
      .sort((a, b) => a[0] - b[0])
      .reduce((acc, r) => {
        if (acc.length > 0 && r[0] <= acc[acc.length - 1][1]) {
          acc[acc.length - 1][1] = Math.max(acc[acc.length - 1][1], r[1])
        } else {
          acc.push([r[0], r[1]])
        }
        return acc
      }, [])
      .filter(r => r[0] < r[1])
    if (merged.length > 0) tags.push({name, value, ranges: merged})
  })

  return {string: stripped, tags}
}
