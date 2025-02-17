import {html, css} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import '@material/mwc-textfield'

import {GrampsjsViewNewObject} from './GrampsjsViewNewObject.js'
import '../components/GrampsjsFormString.js'
import '../components/GrampsjsFormPrivate.js'

const dataDefault = {_class: 'Source', reporef_list: []}

export class GrampsjsViewNewSource extends GrampsjsViewNewObject {
  static get styles() {
    return [
      super.styles,
      css`
        .hidden {
          display: none;
        }
      `,
    ]
  }

  constructor() {
    super()
    this.data = {...dataDefault}
    this.postUrl = '/api/sources/'
    this.itemPath = 'source'
    this.objClass = 'Source'
  }

  renderContent() {
    return html`
      <h2>${this._('New Source')}</h2>

      <h4 class="label">${this._('Title')}</h4>
      <p>
        <mwc-textfield
          required
          validationMessage="${this._('This field is mandatory')}"
          style="width:100%;"
          @input="${this.handleName}"
          id="source-name"
        ></mwc-textfield>
      </p>

      <h4 class="label">${this._('Author')}</h4>
      <p>
        <grampsjs-form-string fullwidth id="author"></grampsjs-form-string>
      </p>

      <h4 class="label">${this._('Publication info')}</h4>
      <p>
        <grampsjs-form-string fullwidth id="pubinfo"></grampsjs-form-string>
      </p>

      <h4 class="label">${this._('Abbreviation')}</h4>
      <p>
        <grampsjs-form-string fullwidth id="abbrev"></grampsjs-form-string>
      </p>

      <h4 class="label">${this._('Repository')}</h4>

      <grampsjs-form-select-object-list
        id="reporef"
        objectType="repository"
        .appState="${this.appState}"
      ></grampsjs-form-select-object-list>

      <div class="${classMap({hidden: !this._hasRepoRef()})}">
        <h4 class="label">${this._('Call Number')}</h4>
        <p>
          <grampsjs-form-string
            fullwidth
            id="call_number"
            value="${this.data?.reporef_list?.[0]?.call_number ?? ''}"
            ?disabled="${!this._hasRepoRef()}"
          ></grampsjs-form-string>
        </p>

        <h4 class="label">${this._('_Media Type:').replace(':', '')}</h4>

          <grampsjs-form-select-type
            ?disabled="${!this._hasRepoRef()}"
            id="source-media-type"
            heading=" "
            .appState="${this.appState}"
            ?loadingTypes="${this.loadingTypes}"
            typeName="source_media_types"
            defaultTypeName="Unknown"
            .types="${this.types}"
            .typesLocale="${this.typesLocale}"
          >
          </grampsjs-form-select-type>
        </div>
        <div class="spacer"></div>
        <grampsjs-form-private
          id="private"
          .appState="${this.appState}"
        ></grampsjs-form-private>

        ${this.renderButtons()}
      </h4>
    `
    // <pre>${JSON.stringify(this.data, null, 2)}</pre>
  }

  _hasRepoRef() {
    return !!this.data?.reporef_list?.length
  }

  handleName(e) {
    this.checkFormValidity()
    this.data = {...this.data, title: e.target.value.trim()}
  }

  _handleFormData(e) {
    const originalTarget = e.composedPath()[0]
    this.checkFormValidity()
    super._handleFormData(e)
    if (originalTarget.id === 'reporef-list') {
      const handle = e.detail?.data?.[0]
      const repoRefList =
        handle === undefined ? [] : [{_class: 'RepoRef', ref: handle}]
      this.data = {
        ...this.data,
        reporef_list: repoRefList,
      }
    }
    if (originalTarget.id === 'call_number') {
      if (this._hasRepoRef()) {
        const repoRef = {
          ...this.data.reporef_list[0],
          call_number: e.detail.data,
        }
        this.data = {
          ...this.data,
          reporef_list: [repoRef],
        }
      }
    }
    if (originalTarget.id === 'source-media-type') {
      if (this._hasRepoRef()) {
        const repoRef = {
          ...this.data.reporef_list[0],
          media_type: {_class: 'SourceMediaType', string: e.detail.data},
        }
        this.data = {
          ...this.data,
          reporef_list: [repoRef],
        }
      }
    }
  }

  checkFormValidity() {
    const name = this.shadowRoot.getElementById('source-name')
    name.reportValidity()
    try {
      this.isFormValid = name?.validity?.valid
    } catch {
      this.isFormValid = false
    }
  }

  _reset() {
    super._reset()
    this.isFormValid = false
    this.data = {...dataDefault}
  }
}

window.customElements.define('grampsjs-view-new-source', GrampsjsViewNewSource)
