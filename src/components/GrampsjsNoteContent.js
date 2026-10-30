import {html, css, LitElement} from 'lit'
import {classMap} from 'lit/directives/class-map.js'
import {sharedStyles} from '../SharedStyles.js'
import {mdiImage} from '@mdi/js'
import {hasThumbnail, linkUrls, mediaIconPath} from '../util.js'
import {getThumbnailUrl} from '../api.js'
import {IMAGE_PLACEHOLDER} from '../inlineImages.js'
import './GrampsjsIcon.js'
import './GrampsjsMediaPlayer.js'

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

// Show the link `a` as a small icon named `label`
function _renderInlineIcon(a, path, label) {
  const icon = document.createElement('grampsjs-icon')
  icon.className = 'inline-image-icon'
  icon.path = path
  icon.color = 'var(--grampsjs-body-font-color-50)'
  a.classList.remove('inline-image')
  a.setAttribute('aria-label', label)
  a.replaceChildren(icon)
}

// Replace the link `a` by a video player captioned with a link named
// `label`, since clicks on player controls inside a link would follow it
function _renderInlineVideo(a, media, label) {
  const container = document.createElement('div')
  container.className = 'inline-image'
  const player = document.createElement('grampsjs-media-player')
  player.handle = media.handle
  player.mime = media.mime
  const caption = document.createElement('a')
  caption.className = 'inline-image-caption'
  caption.setAttribute('href', a.getAttribute('href'))
  caption.textContent = label
  container.append(player, caption)
  a.replaceWith(container)
}

// Replace the links of inline image placeholders by the images, for media
// objects found in `mediaById` (Gramps ID to media object). Videos become
// players. Media without a thumbnail, or whose thumbnail fails to load, show
// the icon of their type, and missing media an image icon. Without a
// description, the Gramps ID names the link.
export function renderInlineImages(container, mediaById) {
  for (const a of container.querySelectorAll('a[href]')) {
    if (a.textContent !== IMAGE_PLACEHOLDER) continue
    const parsed = _parseGrampsHref(a.getAttribute('href'))
    if (parsed?.objectType !== 'media') continue
    const media = mediaById[parsed.grampsId]
    if (!media) {
      _renderInlineIcon(a, mdiImage, parsed.grampsId)
      continue
    }
    const label = media.desc || parsed.grampsId
    if (media.mime?.startsWith('video/')) {
      _renderInlineVideo(a, media, label)
      continue
    }
    if (!hasThumbnail(media.mime)) {
      _renderInlineIcon(a, mediaIconPath(media.mime), label)
      continue
    }
    const img = document.createElement('img')
    img.src = getThumbnailUrl(media.handle, 1000, false, media.checksum)
    img.alt = label
    img.loading = 'lazy'
    img.addEventListener('error', () =>
      _renderInlineIcon(a, mediaIconPath(media.mime), label)
    )
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

        a.inline-image,
        div.inline-image {
          display: block;
          margin: 1.5em 0;
          text-align: center;
          text-decoration: none;
          color: inherit;
        }

        a.inline-image-caption {
          text-decoration: none;
          color: inherit;
        }

        .inline-image {
          --inline-media-max-height: min(30rem, 70vh);
        }

        .inline-image grampsjs-media-player {
          display: flex;
          justify-content: center;
          --grampsjs-media-player-max-height: var(--inline-media-max-height);
        }

        a.inline-image img {
          max-width: 100%;
          max-height: var(--inline-media-max-height);
          border-radius: 4px;
        }

        .inline-image-icon {
          width: 1.2em;
          height: 1.2em;
          display: inline-block;
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
