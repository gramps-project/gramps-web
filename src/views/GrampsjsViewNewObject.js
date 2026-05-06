import {html, css} from 'lit'

import '@material/mwc-select'
import '@material/mwc-list/mwc-list-item'
import '@material/mwc-textarea'
import '@material/mwc-formfield'
import '@material/web/button/outlined-button.js'
import '@material/web/button/filled-button.js'

import {mdiClose, mdiContentSave} from '@mdi/js'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsIcon.js'
import {clearDraftsWithPrefix} from '../api.js'
import {GrampsjsNewObjectTagsMixin} from '../mixins/GrampsjsNewObjectTagsMixin.js'

export class GrampsjsViewNewObject extends GrampsjsNewObjectTagsMixin(
  GrampsjsView
) {
  static get styles() {
    return [
      super.styles,
      css`
        div.spacer {
          margin-top: 2em;
        }

        p.right {
          text-align: right;
        }

        h3 {
          font-size: 1.35em;
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Object},
      types: {type: Object},
      typesLocale: {type: Object},
      loadingTypes: {type: Boolean},
      postUrl: {type: String},
      itemPath: {type: String},
      objClass: {type: String},
      isFormValid: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.data = {}
    this.types = {}
    this.typesLocale = {}
    this.loadingTypes = false
    this.postUrl = ''
    this.itemPath = ''
    this.objClass = ''
    this.isFormValid = false
  }

  update(changed) {
    super.update(changed)
    if (changed.has('active')) {
      this._updateData()
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _reset() {
    this.shadowRoot
      .querySelectorAll(
        [
          'grampsjs-form-select-type',
          'grampsjs-form-private',
          'grampsjs-form-object-list',
          'grampsjs-form-select-object',
          'grampsjs-form-select-object-list',
          'grampsjs-form-select-date',
          'grampsjs-form-string',
          'grampsjs-form-upload',
          'grampsjs-form-name',
        ].join(', ')
      )
      .forEach(element => element.reset())
    this.shadowRoot.querySelectorAll('mwc-textfield').forEach(element => {
      // eslint-disable-next-line no-param-reassign
      element.value = ''
    })
  }

  _submit() {
    this.appState.apiPost(this.postUrl, this.data).then(data => {
      if ('data' in data) {
        this.error = false
        const grampsId = data.data.filter(
          obj => obj.new._class === this.objClass
        )[0].new.gramps_id

        // Clear drafts after successful save
        // Compute prefix from current path
        const {page, pageId} = this.appState?.path || {page: '', pageId: ''}
        const prefix = `${page}:${pageId}:`
        clearDraftsWithPrefix(prefix)

        this.dispatchEvent(
          new CustomEvent('nav', {
            bubbles: true,
            composed: true,
            detail: {path: this._getItemPath(grampsId)},
          })
        )
        this._reset()
      } else if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
      }
    })
  }

  // eslint-disable-next-line class-methods-use-this
  _getItemPath(grampsId) {
    return `${this.itemPath}/${grampsId}`
  }

  renderButtons() {
    return html`
      <div class="spacer"></div>
      <p class="right">
        <md-outlined-button @click="${this._reset}">
          <grampsjs-icon
            slot="icon"
            path="${mdiClose}"
            color="var(--md-outlined-button-label-text-color, var(--mdc-theme-primary))"
          ></grampsjs-icon>
          ${this._('Cancel')}
        </md-outlined-button>
        <md-filled-button
          @click="${this._submit}"
          ?disabled=${!this.isFormValid}
        >
          <grampsjs-icon
            slot="icon"
            path="${mdiContentSave}"
            color="var(--md-filled-button-label-text-color, var(--mdc-theme-on-primary))"
          ></grampsjs-icon>
          ${this._('Add')}
        </md-filled-button>
      </p>
    `
  }

  _renderCitationForm() {
    return html`
      <h3>${this._('Citation')}</h3>

      <grampsjs-form-select-object-list
        multiple
        id="object-citation"
        objectType="citation"
        .appState="${this.appState}"
      ></grampsjs-form-select-object-list>
    `
  }

  _updateData() {
    this.loading = true
    this.loadingTypes = true
    this.appState
      .apiGet('/api/types/')
      .then(data => {
        this.loading = false
        if ('data' in data) {
          this.types = data.data || {}
          this.error = false
        } else if ('error' in data) {
          this.error = true
          this._errorMessage = data.error
        }
      })
      .then(() => {
        this.loading = true
        this.appState.apiGet('/api/types/?locale=1').then(data => {
          this.loading = false
          this.loadingTypes = false
          if ('data' in data) {
            this.typesLocale = data.data || {}
            this.error = false
          } else if ('error' in data) {
            this.error = true
            this._errorMessage = data.error
          }
        })
      })
  }

  translateTypeName(isCustom, typeKey, string) {
    const types =
      (this.types[isCustom ? 'custom' : 'default'] || {})[typeKey] || []
    const ind = types.indexOf(string)
    try {
      return this.typesLocale[isCustom ? 'custom' : 'default'][typeKey][ind]
    } catch {
      return string
    }
  }

  connectedCallback() {
    super.connectedCallback()
    this.addEventListener('formdata:changed', this._handleFormData.bind(this))
  }

  disconnectedCallback() {
    this.removeEventListener(
      'formdata:changed',
      this._handleFormData.bind(this)
    )
    super.disconnectedCallback()
  }

  _handleFormData(e) {
    const originalTarget = e.composedPath()[0]
    if (originalTarget.id === 'private') {
      this.data = {...this.data, private: e.detail.checked}
    }
    if (
      ['author', 'pubinfo', 'abbrev', 'page', 'desc', 'description'].includes(
        originalTarget.id
      )
    ) {
      this.data = {...this.data, [originalTarget.id]: e.detail.data}
    }
    if (originalTarget.id === 'object-citation-list') {
      this.data = {
        ...this.data,
        citation_list: e.detail.data ?? [],
      }
    }
  }
}
