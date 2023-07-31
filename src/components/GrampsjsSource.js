import {html, css} from 'lit'

import '@material/mwc-icon'
import '@material/mwc-button'

import {GrampsjsObject} from './GrampsjsObject.js'
import './GrampsjsFormEditTitle.js'
import {fireEvent} from '../util.js'

export class GrampsjsSource extends GrampsjsObject {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
        }
      `,
    ]
  }

  constructor() {
    super()
    this._showReferences = false
    this._objectsName = 'Sources'
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
    return html` <p style="clear: both; margin-top: 1em;">
      <mwc-button
        outlined
        label="${this._('Show in blog')}"
        @click="${this._handleButtonClick}"
      >
      </mwc-button>
    </p>`
  }

  _handleButtonClick() {
    fireEvent(this, 'nav', {path: `blog/${this.data.gramps_id}`})
  }

  _handleEditTitle() {
    this.dialogContent = html`
      <grampsjs-form-edit-title
        @object:save="${this._handleSaveTitle}"
        @object:cancel="${this._handleCancelDialog}"
        .strings=${this.strings}
        .data=${{title: this.data?.title || ''}}
        prop="title"
      >
      </grampsjs-form-edit-title>
    `
  }

  _handleSaveTitle(e) {
    fireEvent(this, 'edit:action', {action: 'updateProp', data: e.detail.data})
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }
}

window.customElements.define('grampsjs-source', GrampsjsSource)
