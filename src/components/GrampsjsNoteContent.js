import {html, css, LitElement} from 'lit'
import {classMap} from 'lit/directives/class-map.js'
import {sharedStyles} from '../SharedStyles.js'
import {linkUrls} from '../util.js'

const NAVIGABLE = new Set([
  'person',
  'family',
  'event',
  'place',
  'source',
  'citation',
  'repository',
  'note',
  'media',
])
const PREVIEWABLE = new Set([
  'person',
  'family',
  'place',
  'event',
  'source',
  'citation',
  'repository',
  'note',
  'media',
])
const NO_HOVER =
  typeof window !== 'undefined' && window.matchMedia?.('(hover: none)').matches

export function _parseGrampsHref(href) {
  // Resolved link from link_format: /person/I0042 or person/I0042
  const m = href.match(/^\/?([a-z]+)\/([^/]+)$/)
  if (m && NAVIGABLE.has(m[1])) return {objectType: m[1], grampsId: m[2]}
  return null
}

export class GrampsjsNoteContent extends LitElement {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          font-family: var(
            --grampsjs-note-font-family,
            var(--grampsjs-body-font-family)
          );
          font-size: var(--grampsjs-note-font-size, 17px);
          line-height: var(--grampsjs-note-line-height, 1.7em);
          color: var(--grampsjs-note-color);
        }

        .note {
          font-weight: 350;
        }

        .note.columns {
          column-width: 30em;
          column-gap: 2em;
          orphans: 2;
          widows: 2;
        }

        .note-container.frame {
          border-left: 3px solid var(--md-sys-color-outline-variant);
          padding: 4px 24px;
        }

        .note-container.frame p {
          margin: 2em 0em;
        }

        .note-container.frame p:first-child {
          margin-top: 0;
        }

        .note-container.frame p:last-child {
          margin-bottom: 0;
        }
      `,
    ]
  }

  static get properties() {
    return {
      grampsId: {type: String},
      content: {type: String},
      framed: {type: Boolean},
      columns: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.framed = false
    this.columns = false
  }

  render() {
    return html`
      <div class="note-container ${this.framed ? 'frame' : ''}">
        <div
          id="note-content"
          class="${classMap({note: true, columns: this.columns})}"
        ></div>
        <slot></slot>
      </div>
    `
  }

  updated() {
    const noteContent = this.shadowRoot.getElementById('note-content')
    noteContent.innerHTML = linkUrls(this.content)
    this.columns = noteContent.textContent.length > 1000
    this._wireLinks(noteContent)
  }

  _wireLinks(container) {
    for (const a of container.querySelectorAll('a[href]')) {
      const parsed = _parseGrampsHref(a.getAttribute('href'))
      if (!parsed) continue
      a.addEventListener('click', e => {
        e.preventDefault()
        this.dispatchEvent(
          new CustomEvent('nav', {
            bubbles: true,
            composed: true,
            detail: {path: `${parsed.objectType}/${parsed.grampsId}`},
          })
        )
      })
      if (NO_HOVER || !PREVIEWABLE.has(parsed.objectType)) continue
      a.addEventListener('mouseenter', () => {
        window.dispatchEvent(
          new CustomEvent('object:preview-show', {
            detail: {
              objectType: parsed.objectType,
              grampsId: parsed.grampsId,
              anchorRect: a.getBoundingClientRect(),
            },
          })
        )
      })
      a.addEventListener('mouseleave', () => {
        window.dispatchEvent(new CustomEvent('object:preview-hide'))
      })
    }
  }
}

window.customElements.define('grampsjs-note-content', GrampsjsNoteContent)
