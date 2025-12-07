import {html} from 'lit'

import '@material/mwc-icon'
import '@material/web/button/outlined-button'

import {GrampsjsObject} from './GrampsjsObject.js'
import './GrampsjsFormEditTitle.js'
import './GrampsjsFormEditSourceData.js'
import {fireEvent} from '../util.js'

export class GrampsjsSource extends GrampsjsObject {
  constructor() {
    super()
    this._showReferences = false
    this._objectsName = 'Sources'
    this._objectEndpoint = 'sources'
    this._objectIcon = 'bookmarks'
  }

  renderProfile() {
    return html`
      <h2>
        ${this.data.title || this._('Media Object')}
        ${this.edit
          ? html`
              <mwc-icon-button
                icon="edit"
                class="edit"
                @click="${this._handleEditTitle}"
              ></mwc-icon-button>
            `
          : ''}
      </h2>

      <dl>
        ${this.data?.abbrev
          ? html`
              <div>
                <dt>${this._('Abbreviation')}</dt>
                <dd>${this.data.abbrev}</dd>
              </div>
            `
          : ''}
        ${this.data?.author
          ? html`
              <div>
                <dt>${this._('Author')}</dt>
                <dd>${this.data.author}</dd>
              </div>
            `
          : ''}
        ${this.data?.pubinfo
          ? html`
              <div>
                <dt>${this._('Publication info')}</dt>
                <dd>${this.data.pubinfo}</dd>
              </div>
            `
          : ''}
      </dl>
      ${this.edit
        ? html`
            <div>
              <dd>
                <mwc-icon-button
                  icon="edit"
                  class="edit"
                  @click="${this._handleSourceData}"
                ></mwc-icon-button>
              </dd>
            </div>
          `
        : ''}
      ${this._renderBlogBtn()}
    `
  }

  // eslint-disable-next-line class-methods-use-this
  renderPicture() {
    return ''
  }

  _renderBlogBtn() {
    const tags = this.data?.extended?.tags || []
    if (!tags.filter(tag => tag.name === 'Blog').length > 0) {
      return ''
    }
    return html` <p style="clear: both; padding-top: 1em;">
      <md-outlined-button @click="${this._handleButtonClick}">
        ${this._('Show in blog')}
      </md-outlined-button>
    </p>`
  }

  _handleButtonClick() {
    fireEvent(this, 'nav', {path: `blog/${this.data.gramps_id}`})
  }

  _handleEditTitle() {
    this.dialogContent = html`
      <grampsjs-form-edit-title
        @object:save="${this._handleSaveProps}"
        @object:cancel="${this._handleCancelDialog}"
        .appState="${this.appState}"
        .data=${{title: this.data?.title || ''}}
        prop="title"
      >
      </grampsjs-form-edit-title>
    `
  }

  _handleSaveProps(e) {
    fireEvent(this, 'edit:action', {action: 'updateProp', data: e.detail.data})
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleSourceData() {
    const data = {
      abbrev: this.data?.abbrev,
      author: this.data?.author,
      pubinfo: this.data?.pubinfo,
    }
    this.dialogContent = html`
      <grampsjs-form-edit-source-data
        @object:save="${this._handleSaveProps}"
        @object:cancel="${this._handleCancelDialog}"
        .appState="${this.appState}"
        .data=${data}
      >
      </grampsjs-form-edit-source-data>
    `
  }
}

window.customElements.define('grampsjs-source', GrampsjsSource)
