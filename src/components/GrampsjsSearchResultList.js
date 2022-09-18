import {LitElement, css, html} from 'lit'
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

export class GrampsjsSearchResultList extends GrampsjsTranslateMixin(
  LitElement
) {
  static get styles() {
    return [
      css`
        mwc-list {
          --mdc-list-item-graphic-margin: 16px;
        }

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
      metaIcon: {type: String},
      date: {type: Boolean},
      noSep: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.data = []
    this.textEmpty = ''
    this.activatable = false
    this.selectable = false
    this.metaIcon = ''
    this.date = false
    this.noSep = false
  }

  render() {
    return html`
      <mwc-list id="search-results" ?activatable="${this.activatable}">
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
              ?noninteractive="${!this.selectable}"
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
    if (handle) {
      return html`<grampsjs-img
        handle="${handle}"
        slot="graphic"
        circle
        square
        size="70"
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

  _handleMetaClick(e, obj) {
    e.preventDefault()
    e.stopPropagation()
    fireEvent(this, 'search-result:metaClicked', obj)
  }

  _handleClick(obj) {
    fireEvent(this, 'search-result:clicked', obj)
  }
}

window.customElements.define(
  'grampsjs-search-result-list',
  GrampsjsSearchResultList
)
