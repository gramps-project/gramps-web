import {charLength} from '../charUtils.js'

const _SAFE_LINK_PROTOCOLS = ['http:', 'https:', 'mailto:', 'gramps:']

// Parse an HTML string (e.g. from the clipboard) into a StyledText-compatible
// {string, tags} object, preserving only what StyledText can represent.
export function parseHtmlToStyledText(html) {
  const tmp = document.createElement('div')
  tmp.innerHTML = html

  let text = ''
  // Flat list of {start, end, name, value} in code-point indices
  const segments = []
  // Stack of {type:'ol'|'ul', counter:number} — one entry per open list
  const listStack = []

  function walk(node, activeFormats, inPre) {
    if (node.nodeType === Node.TEXT_NODE) {
      let nodeText = node.textContent
      if (!inPre) {
        // Mimic CSS white-space:normal — collapse any whitespace run to one space
        nodeText = nodeText.replace(/[ \t\r\n]+/g, ' ')
        // Suppress a leading space that would double up against existing whitespace
        if (
          nodeText.startsWith(' ') &&
          (text.length === 0 || /[ \n]$/.test(text))
        ) {
          nodeText = nodeText.slice(1)
        }
      }
      if (nodeText.length === 0) return
      const start = charLength(text)
      text += nodeText
      const end = charLength(text)
      if (start < end) {
        activeFormats.forEach(fmt =>
          segments.push({start, end, name: fmt.name, value: fmt.value})
        )
      }
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return

    const tag = node.tagName.toLowerCase()
    if (tag === 'script' || tag === 'style') return

    if (tag === 'br') {
      text += '\n'
      return
    }

    // Accumulate formats added by this element
    const newFormats = [...activeFormats]

    const style = node.style || {}

    const isHeading = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)

    // Semantic elements
    if (tag === 'b' || tag === 'strong' || isHeading) {
      newFormats.push({name: 'bold', value: null})
    } else if (tag === 'i' || tag === 'em') {
      newFormats.push({name: 'italic', value: null})
    } else if (tag === 'u') {
      newFormats.push({name: 'underline', value: null})
    } else if (tag === 's' || tag === 'del' || tag === 'strike') {
      newFormats.push({name: 'strikethrough', value: null})
    } else if (tag === 'sup') {
      newFormats.push({name: 'superscript', value: null})
    } else if (tag === 'a') {
      const href = node.getAttribute('href') || ''
      try {
        const proto = new URL(href).protocol
        if (_SAFE_LINK_PROTOCOLS.includes(proto)) {
          newFormats.push({name: 'link', value: href})
        }
      } catch {
        // relative or malformed — skip
      }
    }

    // CSS-based formatting — only structural intent (bold/italic/decoration).
    // Font family, size, color and highlight are NOT picked up from paste: they
    // are almost always ambient document styles, not intentional formatting.
    const fw = style.fontWeight
    if (fw === 'bold' || fw === 'bolder' || (parseInt(fw, 10) >= 600 && fw)) {
      newFormats.push({name: 'bold', value: null})
    }
    if (style.fontStyle === 'italic' || style.fontStyle === 'oblique') {
      newFormats.push({name: 'italic', value: null})
    }
    const td = style.textDecoration || style.textDecorationLine || ''
    if (td.includes('underline')) {
      newFormats.push({name: 'underline', value: null})
    }
    if (td.includes('line-through')) {
      newFormats.push({name: 'strikethrough', value: null})
    }

    // Preserve whitespace inside <pre> or elements with white-space:pre/pre-wrap
    const ws = style.whiteSpace || ''
    const nextInPre =
      inPre || tag === 'pre' || ws === 'pre' || ws === 'pre-wrap'

    // Double-break: blank line before + after. Single-break: one \n after.
    // Nested ul/ol (already inside a list) don't get extra blank lines.
    const isDoubleBreak =
      isHeading ||
      ['p', 'div', 'blockquote'].includes(tag) ||
      (['ul', 'ol'].includes(tag) && listStack.length === 0)
    const isSingleBreak = ['li', 'td', 'th'].includes(tag)

    // Ensure a blank line before any double-break element that follows text
    if (isDoubleBreak && text.length > 0 && !text.endsWith('\n\n')) {
      if (text.endsWith('\n')) text += '\n'
      else text += '\n\n'
    }

    // List context: push before walking children
    if (tag === 'ol') listStack.push({type: 'ol', counter: 1})
    else if (tag === 'ul') listStack.push({type: 'ul'})

    // List item: insert marker before content
    if (tag === 'li') {
      if (text.length > 0 && !text.endsWith('\n')) text += '\n'
      const depth = Math.max(0, listStack.length - 1)
      const indent = '  '.repeat(depth)
      const ctx = listStack[listStack.length - 1]
      if (ctx?.type === 'ol') {
        text += `${indent}${ctx.counter}. `
        ctx.counter += 1
      } else {
        text += `${indent}• `
      }
    }

    for (const child of node.childNodes) {
      walk(child, newFormats, nextInPre)
    }

    // List context: pop after children
    if (tag === 'ol' || tag === 'ul') listStack.pop()

    // Post-children newline separators
    if (isDoubleBreak && text.length > 0) {
      if (!text.endsWith('\n\n')) {
        if (text.endsWith('\n')) text += '\n'
        else text += '\n\n'
      }
    } else if (isSingleBreak && text.length > 0 && !text.endsWith('\n')) {
      text += '\n'
    }
  }

  walk(tmp, [], false)

  // Strip leading and trailing newlines; track how many were removed from the
  // front so tag ranges can be shifted accordingly.
  const leadNL = (text.match(/^\n*/) || [''])[0].length
  const stripped = text.slice(leadNL).replace(/\n+$/, '')
  const trimmedLen = charLength(stripped)

  // Build tags: group segments by (name, value), merge overlapping/adjacent ranges
  const tagMap = new Map()
  segments.forEach(({start, end, name, value}) => {
    const adjStart = start - leadNL
    const adjEnd = end - leadNL
    const clampedStart = Math.max(0, adjStart)
    const clampedEnd = Math.min(adjEnd, trimmedLen)
    if (clampedEnd <= clampedStart) return
    const key = `${name}\0${value ?? ''}`
    if (!tagMap.has(key)) {
      tagMap.set(key, {name, value, ranges: []})
    }
    tagMap.get(key).ranges.push([clampedStart, clampedEnd])
  })

  const tags = []
  tagMap.forEach(({name, value, ranges}) => {
    const sorted = ranges.slice().sort((a, b) => a[0] - b[0])
    const merged = sorted.reduce((acc, r) => {
      if (acc.length > 0 && r[0] <= acc[acc.length - 1][1]) {
        acc[acc.length - 1][1] = Math.max(acc[acc.length - 1][1], r[1])
      } else {
        acc.push([r[0], r[1]])
      }
      return acc
    }, [])
    const valid = merged.filter(r => r[0] < r[1])
    if (valid.length > 0) {
      tags.push({name, value, ranges: valid})
    }
  })

  return {string: stripped, tags}
}
