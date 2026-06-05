import {LitElement, css, html} from 'lit'

import {fireEvent} from '../util.js'

// Replaced at build time by rollup
const BASE_DIR = ''

const SHOW_DELAY = 250
const HIDE_DELAY = 250

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

export class GrampsjsObjectLink extends LitElement {
  static get styles() {
    return css`
      :host {
        display: inline;
      }
      a:link,
      a:visited {
        color: var(--grampsjs-color-link-font);
        text-decoration: none;
      }
      a:hover {
        color: var(--grampsjs-color-link-hover);
        text-decoration: underline;
        text-decoration-thickness: 1px;
        text-underline-offset: 0.2em;
      }
    `
  }

  static get properties() {
    return {
      objectType: {type: String, attribute: 'object-type'},
      grampsId: {type: String, attribute: 'gramps-id'},
    }
  }

  constructor() {
    super()
    this.objectType = ''
    this.grampsId = ''
    this._showTimer = null
    this._hideTimer = null
  }

  get _href() {
    return `${BASE_DIR}/${this.objectType}/${this.grampsId}`
  }

  get _canPreview() {
    return (
      !NO_HOVER && PREVIEWABLE.has(this.objectType) && Boolean(this.grampsId)
    )
  }

  _handleClick(e) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
      return
    e.preventDefault()
    fireEvent(this, 'nav', {path: `${this.objectType}/${this.grampsId}`})
  }

  _handleMouseEnter() {
    if (!this._canPreview) return
    clearTimeout(this._hideTimer)
    this._showTimer = setTimeout(() => {
      const anchorRect = this.getBoundingClientRect()
      window.dispatchEvent(
        new CustomEvent('object:preview-show', {
          detail: {
            objectType: this.objectType,
            grampsId: this.grampsId,
            anchorRect,
          },
        })
      )
    }, SHOW_DELAY)
  }

  _handleMouseLeave() {
    if (!this._canPreview) return
    clearTimeout(this._showTimer)
    this._hideTimer = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('object:preview-hide'))
    }, HIDE_DELAY)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    clearTimeout(this._showTimer)
    clearTimeout(this._hideTimer)
  }

  render() {
    return html`<a
      href="${this._href}"
      @click="${this._handleClick}"
      @mouseenter="${this._handleMouseEnter}"
      @mouseleave="${this._handleMouseLeave}"
      ><slot></slot
    ></a>`
  }
}

window.customElements.define('grampsjs-object-link', GrampsjsObjectLink)
