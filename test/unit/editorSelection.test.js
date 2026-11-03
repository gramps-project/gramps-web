import {describe, it, expect, vi, afterEach} from 'vitest'
import '../../src/components/GrampsjsEditor.js'

const GrampsjsEditor = customElements.get('grampsjs-editor')
const getSelectionRange = GrampsjsEditor.prototype._getSelectionRange

const RANGE = {startContainer: 'node', startOffset: 1, collapsed: true}

// a Selection holding `ranges`, without getComposedRanges unless `composed`
function selection(ranges, composed) {
  const sel = {
    rangeCount: ranges.length,
    getRangeAt: i => ranges[i],
  }
  if (composed) sel.getComposedRanges = composed
  return sel
}

function editor(shadowSelection) {
  const shadowRoot = {}
  if (shadowSelection) shadowRoot.getSelection = () => shadowSelection
  return {shadowRoot}
}

afterEach(() => vi.restoreAllMocks())

describe('_getSelectionRange', () => {
  it('uses getComposedRanges with the shadow root where available', () => {
    const composed = vi.fn(() => [RANGE])
    vi.spyOn(document, 'getSelection').mockReturnValue(selection([], composed))
    const ed = editor()
    expect(getSelectionRange.call(ed)).toBe(RANGE)
    expect(composed).toHaveBeenCalledWith({shadowRoots: [ed.shadowRoot]})
  })

  it("falls back to the shadow root's selection (older Chromium)", () => {
    vi.spyOn(document, 'getSelection').mockReturnValue(selection([]))
    expect(getSelectionRange.call(editor(selection([RANGE])))).toBe(RANGE)
  })

  it('falls back to the document selection (older Firefox)', () => {
    vi.spyOn(document, 'getSelection').mockReturnValue(selection([RANGE]))
    expect(getSelectionRange.call(editor())).toBe(RANGE)
  })

  it('returns undefined when the fallback selection is empty', () => {
    vi.spyOn(document, 'getSelection').mockReturnValue(selection([]))
    expect(getSelectionRange.call(editor())).toBeUndefined()
    expect(getSelectionRange.call(editor(selection([])))).toBeUndefined()
  })

  it('returns undefined when there is no selection at all', () => {
    vi.spyOn(document, 'getSelection').mockReturnValue(null)
    expect(getSelectionRange.call(editor())).toBeUndefined()
  })
})
