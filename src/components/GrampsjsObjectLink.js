import {LitElement, css, html} from 'lit'

import {appHref, handleAppLinkClick} from '../util.js'

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
  }

  get _href() {
    return appHref(this._path)
  }

  get _canPreview() {
    return (
      !NO_HOVER && PREVIEWABLE.has(this.objectType) && Boolean(this.grampsId)
    )
  }

  get _path() {
    return `${this.objectType}/${this.grampsId}`
  }

  _handleClick(e) {
    handleAppLinkClick(e, this._path)
  }

  _handleMouseEnter() {
    if (!this._canPreview) return
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
  }

  _handleMouseLeave() {
    if (!this._canPreview) return
    window.dispatchEvent(new CustomEvent('object:preview-hide'))
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
