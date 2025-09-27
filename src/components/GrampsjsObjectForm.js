import {html, css, LitElement} from 'lit'

import '@material/web/dialog/dialog.js'
import '@material/web/button/text-button.js'
import '@material/web/button/filled-button.js'

import {sharedStyles} from '../SharedStyles.js'
import {fireEvent, emptyDate} from '../util.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

export class GrampsjsObjectForm extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        div.spacer {
          margin-top: 2em;
        }

        p.right {
          text-align: right;
        }

        mwc-textfield.fullwidth {
          width: 100%;
        }

        .hide {
          display: none;
        }

        mwc-icon-button {
          color: var(--grampsjs-body-font-color-50);
        }

        md-dialog {
          max-width: 100vw;
          min-width: 50vw;
          max-height: 80vh;
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
      // postUrl: {type: String},
      // itemPath: {type: String},
      // objClass: {type: String},
      isFormValid: {type: Boolean},
      new: {type: Boolean},
      dialogTitle: {type: String},
    }
  }

  constructor() {
    super()
    this.data = {}
    this.types = {}
    this.typesLocale = {}
    this.loadingTypes = false
    // this.postUrl = ''
    // this.itemPath = ''
    // this.objClass = ''
    this.isFormValid = false
    this.new = false
    this.dialogTitle = ''
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
    this.shadowRoot
      .querySelectorAll('md-outlined-text-field')
      .forEach(element => {
        // eslint-disable-next-line no-param-reassign
        element.value = ''
      })
    this.shadowRoot
      .querySelectorAll('md-filled-text-field')
      .forEach(element => {
        // eslint-disable-next-line no-param-reassign
        element.value = ''
      })
  }

  // eslint-disable-next-line class-methods-use-this
  get isValid() {
    return true
  }

  _areDateSelectValid() {
    let valid = true
    this.shadowRoot
      .querySelectorAll('grampsjs-form-select-date')
      .forEach(element => {
        if (!element.isValid()) {
          valid = false
        }
      })
    return valid
  }

  render() {
    return html`
      <md-dialog @cancel="${this._handleDialogCancel}" open>
        <div slot="headline">${this.dialogTitle}</div>
        <div slot="content" @formdata:changed="${this._handleFormData}">
          ${this.dialogIsOpen ? this.renderForm() : ''}
        </div>
        <div slot="actions">
          <md-text-button class="edit" @click="${this._handleDialogCancel}">
            ${this._('Cancel')}
          </md-text-button>
          <md-filled-button
            class="edit"
            @click="${this._handleDialogSave}"
            ?disabled="${!this.isValid}"
          >
            ${this._('_Save')}
          </md-filled-button>
        </div>
      </md-dialog>
    `
  }

  _handleDialogSave() {
    fireEvent(this, 'object:save', {data: this.data})
    this._reset()
  }

  _handleDialogCancel() {
    fireEvent(this, 'object:cancel')
    this._reset()
  }

  _openDialog() {
    this.renderRoot.querySelector('md-dialog')?.show()
  }

  get dialogIsOpen() {
    return this.renderRoot.querySelector('md-dialog')?.open ?? false
  }

  open() {
    this._openDialog()
  }

  updateTypeData() {
    this.loadingTypes = true
    this.appState
      .apiGet('/api/types/')
      .then(data => {
        if ('data' in data) {
          this.types = data.data || {}
        } else if ('error' in data) {
          fireEvent(this, 'grampsjs:error', {message: data.error})
        }
      })
      .then(() => {
        this.appState.apiGet('/api/types/?locale=1').then(data => {
          this.loadingTypes = false
          if ('data' in data) {
            this.typesLocale = data.data || {}
            this.error = false
          } else if ('error' in data) {
            fireEvent(this, 'grampsjs:error', {message: data.error})
          }
        })
      })
  }

  firstUpdated() {
    this.updateTypeData()
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

  _handleFormData(e) {
    const originalTarget = e.composedPath()[0]
    if (originalTarget.id === 'private') {
      this.data = {...this.data, private: e.detail.checked}
    }
    if (
      [
        'author',
        'pubinfo',
        'abbrev',
        'page',
        'desc',
        'title',
        'description',
        'path',
        'value',
        'lat',
        'long',
        'call_number',
        'rel',
      ].includes(originalTarget.id)
    ) {
      this.data = {...this.data, [originalTarget.id]: e.detail.data}
    }
    if (
      [
        'event-select-list',
        'media-select-list',
        'child-select-list',
        'place-select-list',
        'person-select-list',
        'repository-select-list',
      ].includes(originalTarget.id)
    ) {
      const [handle] = e.detail.data
      if (handle) {
        this.data = {...this.data, ref: handle}
      } else {
        const {ref, ...rest} = this.data
        this.data = rest
      }
    }
    if (originalTarget.id === 'source-list') {
      this.data = {...this.data, source_handle: e.detail.data[0]}
    }
    if (originalTarget.id === 'place-list') {
      this.data = {...this.data, place: e.detail.data[0]}
    }
    if (originalTarget.id === 'father-list') {
      this.data = {...this.data, father_handle: e.detail.data[0]}
    }
    if (originalTarget.id === 'mother-list') {
      this.data = {...this.data, mother_handle: e.detail.data[0]}
    }
    if (originalTarget.id === 'match-source-list') {
      this.data = {...this.data, source_handle: e.detail.data[0]}
    }
    if (originalTarget.id === 'ydna-person-list') {
      this.data = {...this.data, person_handle: e.detail.data[0]}
    }
    if (originalTarget.id === 'match-target-list') {
      this.data = {...this.data, target_handle: e.detail.data[0]}
    }
    if (originalTarget.id === 'match-data') {
      this.data = {...this.data, raw_data: [e.detail.data]}
    }
    if (originalTarget.id === 'date') {
      this.data = {...this.data, date: e.detail.data ?? emptyDate}
    }
    if (originalTarget.id === 'event-role-type') {
      this.data = {
        ...this.data,
        role: e.detail.data,
      }
    }
    if (originalTarget.id === 'source-media-type') {
      this.data = {
        ...this.data,
        media_type: e.detail.data,
      }
    }
    if (originalTarget.id === 'name-type') {
      this.data = {
        ...this.data,
        type: e.detail.data,
      }
    }
    if (originalTarget.id === 'note-type') {
      this.data = {
        ...this.data,
        type: e.detail.data,
      }
    }
    if (originalTarget.id === 'place-type') {
      this.data = {
        ...this.data,
        place_type: e.detail.data,
      }
    }
    if (originalTarget.id === 'event-type') {
      this.data = {
        ...this.data,
        type: e.detail.data,
      }
    }
    if (originalTarget.id === 'child-frel') {
      this.data = {
        ...this.data,
        frel: e.detail.data,
      }
    }
    if (originalTarget.id === 'child-mrel') {
      this.data = {
        ...this.data,
        mrel: e.detail.data,
      }
    }
    if (originalTarget.id === 'child-mrel') {
      this.data = {
        ...this.data,
        mrel: e.detail.data,
      }
    }
    if (originalTarget.id === 'note-select-list') {
      this.data = e.detail
    }
    if (originalTarget.id === 'object-citation-list') {
      this.data = {
        ...this.data,
        citation_list: e.detail.data ?? [],
      }
    }
    if (originalTarget.id === 'citation-select-list') {
      this.data = e.detail
    }
    if (originalTarget.id === 'personref-citation-select-list') {
      this.data = {...this.data, citation_list: e.detail.data}
    }
    if (originalTarget.id === 'personref-note-select-list') {
      this.data = {...this.data, note_list: e.detail.data}
    }
    if (originalTarget.id === 'name') {
      this.data = e.detail.data
    }
    if (originalTarget.id === 'srcattrtype') {
      this.data = {
        ...this.data,
        type: e.detail.data,
      }
    }
    if (originalTarget.id === 'attrtype') {
      this.data = {
        ...this.data,
        type: e.detail.data,
      }
    }
    if (originalTarget.id === 'family-rel-type') {
      this.data = {
        ...this.data,
        type: e.detail.data,
      }
    }
    if (originalTarget.id === 'urltype') {
      this.data = {
        ...this.data,
        type: e.detail.data,
      }
    }
    if (originalTarget.id === 'place-name-value') {
      this.data = {
        ...this.data,
        value: e.detail.data,
      }
    }
    if (originalTarget.id === 'attrvalue') {
      this.data = {
        ...this.data,
        value: e.detail.data,
      }
    }
    e.preventDefault()
    e.stopPropagation()
  }
}
