import {html} from 'lit'

import '@material/web/button/outlined-button'
import '@material/web/iconbutton/icon-button.js'

import {mdiPencil} from '@mdi/js'

import {GrampsjsObject} from './GrampsjsObject.js'
import './GrampsjsEditableTitle.js'
import './GrampsjsIcon.js'
import './GrampsjsFormEditSourceData.js'
import {fireEvent, linkUrls, objectIconPath} from '../util.js'

export class GrampsjsSource extends GrampsjsObject {
  constructor() {
    super()
    this._showReferences = false
    this._objectsName = 'Sources'
    this._objectEndpoint = 'sources'
    this._objectIcon = objectIconPath.source
  }

  renderProfile() {
    return html`
      <h2>
        <grampsjs-editable-title
          .value="${this.data.title}"
          prop="title"
          placeholder="${this._('Source')}"
          required
          ?editable="${this.edit}"
          .appState="${this.appState}"
        ></grampsjs-editable-title>
      </h2>

      <dl>
        ${this.data?.abbrev || this.edit
          ? html`
              <div>
                <dt>${this._('Abbreviation')}</dt>
                <dd>${this.data.abbrev}</dd>
              </div>
            `
          : ''}
        ${this.data?.author || this.edit
          ? html`
              <div>
                <dt>${this._('Author')}</dt>
                <dd>${this.data.author}</dd>
              </div>
            `
          : ''}
        ${this.data?.pubinfo || this.edit
          ? html`
              <div>
                <dt>${this._('Publication info')}</dt>
                <dd>${linkUrls(this.data.pubinfo ?? '', false)}</dd>
              </div>
            `
          : ''}
        ${this.edit
          ? html`
              <md-icon-button
                class="edit"
                aria-label="${this._('Edit')}"
                @click="${this._handleSourceData}"
              >
                <grampsjs-icon
                  path="${mdiPencil}"
                  color="var(--mdc-theme-secondary)"
                ></grampsjs-icon>
              </md-icon-button>
            `
          : ''}
      </dl>
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
    if (this.preview) return ''
    return html` <p style="clear: both; padding-top: 1em;">
      <md-outlined-button @click="${this._handleButtonClick}">
        ${this._('Show in blog')}
      </md-outlined-button>
    </p>`
  }

  _handleButtonClick() {
    fireEvent(this, 'nav', {path: `blog/${this.data.gramps_id}`})
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
