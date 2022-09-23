import {LitElement, css, html} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import '@material/mwc-icon'
import '@material/mwc-icon-button'
import '@material/mwc-list'
import '@material/mwc-list/mwc-list-item'

import {
  objectDescription,
  objectIcon,
  fireEvent,
  objectDetail,
} from '../util.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'
import './GrampsJsImage.js'
import {sharedStyles} from '../SharedStyles.js'

export class GrampsjsSearchResultList extends GrampsjsTranslateMixin(
  LitElement
) {
  static get styles() {
    return [
      sharedStyles,
      css`
        mwc-icon-button {
          position: relative;
          top: -14px;
          left: -16px;
          --mdc-icon-size: 20px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Array},
      textEmpty: {type: String},
      activatable: {type: Boolean},
      selectable: {type: Boolean},
      linked: {type: Boolean},
      metaIcon: {type: String},
      date: {type: Boolean},
      noSep: {type: Boolean},
      loading: {type: Boolean},
      numberLoading: {type: Number},
      large: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.data = []
    this.textEmpty = ''
    this.activatable = false
    this.selectable = false
    this.linked = false
    this.metaIcon = ''
    this.date = false
    this.noSep = false
    this.loading = false
    this.numberLoading = 2
    this.large = false
  }

  render() {
    if (this.loading) {
      return this.renderLoading()
    }
    return html`
      <mwc-list
        id="search-results"
        ?activatable="${this.activatable}"
        class="${classMap({large: this.large})}"
      >
        ${this.data.length === 0 && this.textEmpty
          ? html`
              <mwc-list-item noninteractive>
                <span>${this.textEmpty}</span>
              </mwc-list-item>
            `
          : ''}
        ${this.data.map((obj, i, arr) => {
          const desc = objectDescription(
            obj.object_type,
            obj.object,
            this.strings
          )
          return html`
            <mwc-list-item
              ?noninteractive="${!this.selectable && !this.linked}"
              twoline
              graphic="avatar"
              @click="${() => this._handleClick(obj)}"
              ?hasMeta=${this.metaIcon !== ''}
            >
              ${this._renderIcon(obj)}
              <mwc-icon-button
                @click="${e => this._handleMetaClick(e, obj)}"
                icon="${this.metaIcon}"
                slot="meta"
              ></mwc-icon-button>
              <span>${desc}</span>
              <span slot="secondary">${this._renderSecondary(obj)}</span>
            </mwc-list-item>
            ${!this.noSep && arr.length - 1 !== i
              ? html`<li divider padded role="separator"></li>`
              : ''}
          `
        }, this)}
      </mwc-list>
    `
  }

  renderLoading() {
    return html` <mwc-list>
      ${Array(this.numberLoading).fill(
        html`
          <mwc-list-item noninteractive twoline graphic="avatar">
            <span class="skeleton" style="width:15em;">&nbsp;</span>
            <span slot="secondary" class="skeleton" style="width:10em;"
              >&nbsp;</span
            >
            <span slot="graphic" class="skeleton avatar">&nbsp;</span>
          </mwc-list-item>
        `
      )}
    </mwc-list>`
  }

  _renderSecondary(obj) {
    if (this.date) {
      return html`<grampsjs-timedelta
        timestamp="${obj.object.change}"
        locale="${this.strings.__lang__}"
      ></grampsjs-timedelta>`
    }
    const detail = objectDetail(
      obj.object_type,
      obj.object,
      this.strings
    ).trim()
    if (detail?.length) {
      return detail
    }
    return obj.object.gramps_id
  }

  // eslint-disable-next-line class-methods-use-this
  _renderIcon(obj) {
    const handle = this._getMediaHandle(obj)
    const rect = this._getMediaRect(obj)
    const mime = this._getMediaMime(obj)
    if (handle) {
      return html`<grampsjs-img
        handle="${handle}"
        slot="graphic"
        circle
        square
        size="70"
        .rect="${rect}"
        .mime="${mime}"
      ></grampsjs-img>`
    }
    return html`<mwc-icon slot="graphic"
      >${objectIcon[obj.object_type]}</mwc-icon
    >`
  }

  // eslint-disable-next-line class-methods-use-this
  _getMediaHandle(obj) {
    if (obj.object_type === 'media') {
      return obj.object.handle
    }
    if (obj.object?.media_list?.length) {
      return obj.object.media_list[0].ref
    }
    return ''
  }

  // eslint-disable-next-line class-methods-use-this
  _getMediaRect(obj) {
    if (obj.object?.media_list?.length) {
      return obj.object.media_list[0].rect
    }
    return []
  }

  // eslint-disable-next-line class-methods-use-this
  _getMediaMime(obj) {
    if (obj.object_type === 'media') {
      return obj.object.mime
    }
    if (obj.object?.extended?.media_list?.length) {
      return obj.object.extended.media_list[0].mime
    }
    return ''
  }

  _handleMetaClick(e, obj) {
    e.preventDefault()
    e.stopPropagation()
    fireEvent(this, 'search-result:metaClicked', obj)
  }

  _handleClick(obj) {
    if (this.linked && obj.object_type && obj.object?.gramps_id) {
      const path = `${obj.object_type}/${obj.object?.gramps_id}`
      fireEvent(this, 'nav', {path})
    }
    fireEvent(this, 'search-result:clicked', obj)
  }
}

window.customElements.define(
  'grampsjs-search-result-list',
  GrampsjsSearchResultList
)
