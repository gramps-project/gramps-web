import {html, css} from 'lit'
import {mdiInformation} from '@mdi/js'

import './GrampsjsIcon.js'
import {objectIconPath} from '../util.js'

export const refCountsStyles = css`
  button.ref-counts {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border: none;
    border-radius: 16px;
    background: none;
    font: inherit;
    font-size: 14px;
    color: var(--grampsjs-body-font-color-60);
    cursor: pointer;
  }

  button.ref-counts:hover,
  button.ref-counts:focus-visible {
    background-color: var(--grampsjs-body-font-color-5);
  }

  button.ref-counts span + grampsjs-icon {
    margin-left: 6px;
  }
`

// the citations/notes/attributes a secondary object has of its own
export function refLists(obj) {
  return {
    citations: obj?.citation_list ?? [],
    notes: obj?.note_list ?? [],
    attributes: obj?.attribute_list ?? [],
  }
}

export function refCounts({citations = [], notes = [], attributes = []}) {
  return [
    [objectIconPath.citation, citations.length],
    [objectIconPath.note, notes.length],
    [mdiInformation, attributes.length],
  ].filter(([, n]) => n > 0)
}

// button with the counts, or nothing if there is nothing to count
export function renderRefCounts(lists, label, onClick, slot = 'end') {
  const counts = refCounts(lists)
  if (counts.length === 0) {
    return ''
  }
  return html`
    <button
      slot="${slot}"
      class="ref-counts"
      aria-label="${label}"
      title="${label}"
      @click="${onClick}"
    >
      ${counts.map(
        ([path, n]) => html`<grampsjs-icon
            path="${path}"
            color="currentColor"
            height="16"
            width="16"
          ></grampsjs-icon
          ><span>${n}</span>`
      )}
    </button>
  `
}
