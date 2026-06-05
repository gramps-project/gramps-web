import {LitElement, css, html, nothing} from 'lit'
import {mdiOpenInNew} from '@mdi/js'

import '@material/web/iconbutton/icon-button.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent} from '../util.js'
import './GrampsjsIcon.js'
import './GrampsjsPerson.js'
import './GrampsjsFamily.js'
import './GrampsjsPlace.js'

const HIDE_DELAY = 250
const CACHE_MAX_SIZE = 50
const POPUP_WIDTH = 580
const POPUP_HEIGHT = 600
const POPUP_MARGIN = 8

const URLS = {
  person: (id, lang) =>
    `/api/people/?gramps_id=${id}&locale=${lang}&profile=all&backlinks=true&extend=all&precision=1`,
  family: (id, lang) =>
    `/api/families/?gramps_id=${id}&locale=${lang}&profile=all&backlinks=true&extend=all&precision=1`,
  place: (id, lang) =>
    `/api/places/?gramps_id=${id}&backlinks=true&extend=all&locale=${lang}&precision=1&profile=all`,
}

export class GrampsjsObjectPreview extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return css`
      :host {
        display: block;
        position: fixed;
        z-index: 9999;
        top: 0;
        left: 0;
      }

      #popup {
        position: fixed;
        width: ${POPUP_WIDTH}px;
        height: ${POPUP_HEIGHT}px;
        background: var(--md-sys-color-surface);
        color: var(--md-sys-color-on-surface);
        border: 1px solid var(--md-sys-color-outline-variant);
        border-radius: 12px;
        box-shadow: 0 8px 24px var(--grampsjs-body-font-color-10),
          0 2px 8px var(--grampsjs-body-font-color-10);
        box-sizing: border-box;
        visibility: hidden;
        opacity: 0;
        transition: opacity 0.15s ease, visibility 0.15s ease;
        pointer-events: none;
        overflow: hidden;
      }

      #popup.visible {
        visibility: visible;
        opacity: 1;
        pointer-events: auto;
      }

      #open-btn {
        position: absolute;
        top: 4px;
        right: 8px;
        z-index: 1;
      }

      #content {
        height: 100%;
        overflow-y: auto;
        padding: 16px;
        padding-right: 56px;
        box-sizing: border-box;
      }
    `
  }

  static get properties() {
    return {
      _visible: {type: Boolean},
      _objectType: {type: String},
      _grampsId: {type: String},
      _data: {type: Object},
      _x: {type: Number},
      _y: {type: Number},
    }
  }

  constructor() {
    super()
    this._visible = false
    this._objectType = ''
    this._grampsId = ''
    this._data = null
    this._x = 0
    this._y = 0
    this._cache = new Map()
    this._hideTimer = null
    this._mouseInPopup = false
    this._boundShow = this._handleShow.bind(this)
    this._boundHide = this._handleHide.bind(this)
    this._boundNav = () => {
      this._visible = false
    }
    this._boundDbChanged = () => {
      this._cache.clear()
    }
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('object:preview-show', this._boundShow)
    window.addEventListener('object:preview-hide', this._boundHide)
    window.addEventListener('nav', this._boundNav)
    window.addEventListener('db:changed', this._boundDbChanged)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    window.removeEventListener('object:preview-show', this._boundShow)
    window.removeEventListener('object:preview-hide', this._boundHide)
    window.removeEventListener('nav', this._boundNav)
    window.removeEventListener('db:changed', this._boundDbChanged)
    clearTimeout(this._hideTimer)
  }

  _handleShow(e) {
    const {objectType, grampsId, anchorRect} = e.detail
    clearTimeout(this._hideTimer)

    this._objectType = objectType
    this._grampsId = grampsId
    this._position(anchorRect)
    this._visible = true
    this.updateComplete.then(() => {
      const content = this.renderRoot.querySelector('#content')
      if (content) content.scrollTop = 0
    })

    const cacheKey = `${objectType}:${grampsId}`
    if (this._cache.has(cacheKey)) {
      this._data = this._cache.get(cacheKey)
    } else {
      this._data = null
      this._fetchData(objectType, grampsId)
    }
  }

  _handleHide() {
    if (this._mouseInPopup) return
    this._hideTimer = setTimeout(() => {
      this._visible = false
    }, HIDE_DELAY)
  }

  _position(anchorRect) {
    const viewportW = window.innerWidth
    const viewportH = window.innerHeight

    let x = anchorRect.left
    if (x + POPUP_WIDTH > viewportW - POPUP_MARGIN) {
      x = viewportW - POPUP_WIDTH - POPUP_MARGIN
    }
    x = Math.max(POPUP_MARGIN, x)

    const spaceBelow = viewportH - anchorRect.bottom - POPUP_MARGIN
    const spaceAbove = anchorRect.top - POPUP_MARGIN
    const flipUp = spaceBelow < POPUP_HEIGHT && spaceAbove > spaceBelow

    this._x = x
    this._y = flipUp
      ? Math.max(POPUP_MARGIN, anchorRect.top - POPUP_HEIGHT - POPUP_MARGIN)
      : Math.min(
          anchorRect.bottom + POPUP_MARGIN,
          viewportH - POPUP_HEIGHT - POPUP_MARGIN
        )
  }

  async _fetchData(objectType, grampsId) {
    const lang = this.appState?.i18n?.lang || 'en'
    const urlFn = URLS[objectType]
    if (!urlFn) return
    const url = urlFn(grampsId, lang)
    const result = await this.appState.apiGet(url)
    if (!result?.data?.[0]) return
    const data = result.data[0]
    const cacheKey = `${objectType}:${grampsId}`
    if (this._cache.size >= CACHE_MAX_SIZE) {
      this._cache.delete(this._cache.keys().next().value)
    }
    this._cache.set(cacheKey, data)
    if (this._grampsId === grampsId && this._objectType === objectType) {
      this._data = data
    }
  }

  _handlePopupMouseEnter() {
    clearTimeout(this._hideTimer)
    this._mouseInPopup = true
  }

  _handlePopupMouseLeave() {
    this._mouseInPopup = false
    this._hideTimer = setTimeout(() => {
      this._visible = false
    }, HIDE_DELAY)
  }

  _handleOpen() {
    this._visible = false
    fireEvent(this, 'nav', {path: `${this._objectType}/${this._grampsId}`})
  }

  _renderContent() {
    if (!this._data) return nothing
    switch (this._objectType) {
      case 'person':
        return html`<grampsjs-person
          .data=${this._data}
          .appState=${this.appState}
          .homePersonDetails=${{}}
          .timelineData=${[]}
          ?preview=${true}
        ></grampsjs-person>`
      case 'family':
        return html`<grampsjs-family
          .data=${this._data}
          .appState=${this.appState}
          ?preview=${true}
        ></grampsjs-family>`
      case 'place':
        return html`<grampsjs-place
          .data=${this._data}
          .appState=${this.appState}
          ?preview=${true}
        ></grampsjs-place>`
      default:
        return nothing
    }
  }

  render() {
    return html`
      <div
        id="popup"
        class="${this._visible ? 'visible' : ''}"
        style="left:${this._x}px;top:${this._y}px"
        @mouseenter="${this._handlePopupMouseEnter}"
        @mouseleave="${this._handlePopupMouseLeave}"
      >
        <md-icon-button
          id="open-btn"
          @click="${this._handleOpen}"
          title="${this._('_Open')}"
        >
          <grampsjs-icon path="${mdiOpenInNew}"></grampsjs-icon>
        </md-icon-button>
        <div id="content">${this._renderContent()}</div>
      </div>
    `
  }
}

window.customElements.define('grampsjs-object-preview', GrampsjsObjectPreview)
