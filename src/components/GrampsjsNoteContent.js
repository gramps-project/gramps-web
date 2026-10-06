import {html, css, LitElement} from 'lit'
import {classMap} from 'lit/directives/class-map.js'
import {sharedStyles} from '../SharedStyles.js'
import {mdiImage} from '@mdi/js'
import {linkUrls} from '../util.js'
import {getThumbnailUrl} from '../api.js'
import {IMAGE_PLACEHOLDER} from '../inlineImages.js'

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

// An image icon standing in for an inline image whose media object is
// unknown
function _imageIcon() {
  const svgNs = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(svgNs, 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('class', 'inline-image-icon')
  const path = document.createElementNS(svgNs, 'path')
  path.setAttribute('d', mdiImage)
  path.setAttribute('fill', 'currentColor')
  svg.append(path)
  return svg
}

// Replace the links of inline image placeholders by the images, for media
// objects found in `mediaById` (Gramps ID to media object), and by an image
// icon otherwise
export function renderInlineImages(container, mediaById) {
  for (const a of container.querySelectorAll('a[href]')) {
    if (a.textContent !== IMAGE_PLACEHOLDER) continue
    const parsed = _parseGrampsHref(a.getAttribute('href'))
    if (parsed?.objectType !== 'media') continue
    const media = mediaById[parsed.grampsId]
    if (!media) {
      a.textContent = ''
      a.append(_imageIcon())
      continue
    }
    const img = document.createElement('img')
    img.src = getThumbnailUrl(media.handle, 1000, false, media.checksum)
    img.alt = media.desc || ''
    img.loading = 'lazy'
    a.textContent = ''
    a.classList.add('inline-image')
    a.append(img)
    if (media.desc) {
      const caption = document.createElement('span')
      caption.className = 'inline-image-caption'
      caption.textContent = media.desc
      a.append(caption)
    }
  }
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

        a.inline-image {
          display: block;
          margin: 1.5em 0;
          text-align: center;
          text-decoration: none;
          color: inherit;
        }

        a.inline-image img {
          max-width: 100%;
          border-radius: 4px;
        }

        .inline-image-icon {
          width: 1.2em;
          height: 1.2em;
          color: var(--grampsjs-body-font-color-50);
          vertical-align: text-bottom;
        }

        .inline-image-caption {
          display: block;
          margin-top: 0.5em;
          font-size: 0.8em;
          line-height: 1.4em;
          opacity: 0.7;
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
      inlineMedia: {type: Object},
    }
  }

  constructor() {
    super()
    this.framed = false
    this.columns = false
    this.inlineMedia = {}
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
    renderInlineImages(noteContent, this.inlineMedia)
    this._wireLinks(noteContent)
    this._styleHighlights(noteContent)
  }

  // Render highlights from the backend HTML like the editor does, blended
  // with the background for dark mode
  // eslint-disable-next-line class-methods-use-this
  _styleHighlights(container) {
    for (const el of container.querySelectorAll('[style]')) {
      const color = el.style.backgroundColor
      if (!color) continue
      el.style.removeProperty('background-color')
      el.style.setProperty('--note-highlight-color', color)
      el.classList.add('note-highlight')
    }
  }

  _wireLinks(container) {
    for (const a of container.querySelectorAll('a[href]')) {
      const parsed = _parseGrampsHref(a.getAttribute('href'))
      if (!parsed) continue
      a.addEventListener('click', e => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
          return
        e.preventDefault()
        this.dispatchEvent(
          new CustomEvent('nav', {
            bubbles: true,
            composed: true,
            detail: {path: `${parsed.objectType}/${parsed.grampsId}`},
          })
        )
      })
      if (
        NO_HOVER ||
        !PREVIEWABLE.has(parsed.objectType) ||
        a.classList.contains('inline-image')
      )
        continue
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
