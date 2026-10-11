import {html, css} from 'lit'
import {classMap} from 'lit/directives/class-map.js'

import '@material/mwc-textfield'

import '../components/GrampsjsFormSelectObjectList.js'
import '../components/GrampsjsFormSelectType.js'
import '../components/GrampsjsFormPrivate.js'
import '../components/GrampsjsFormString.js'

const dataDefault = {_class: 'Source', reporef_list: []}

export const GrampsjsNewSourceMixin = superClass =>
  class extends superClass {
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
    }

    renderForm() {
      return html`
        <h3 class="label">${this._('Title')}</h3>
        <p>
          <mwc-textfield
            required
            validationMessage="${this._('This field is mandatory')}"
            style="width:100%;"
            @input="${this.handleName}"
            id="source-name"
          ></mwc-textfield>
        </p>

        <h3 class="label">${this._('Author')}</h3>
        <p>
          <grampsjs-form-string fullwidth id="author"></grampsjs-form-string>
        </p>

        <h3 class="label">${this._('Publication info')}</h3>
        <p>
          <grampsjs-form-string fullwidth id="pubinfo"></grampsjs-form-string>
        </p>

        <h3 class="label">${this._('Abbreviation')}</h3>
        <p>
          <grampsjs-form-string fullwidth id="abbrev"></grampsjs-form-string>
        </p>

        <h3 class="label">${this._('Repository')}</h3>
        <grampsjs-form-select-object-list
          id="reporef"
          objectType="repository"
          .appState="${this.appState}"
        ></grampsjs-form-select-object-list>

        <div class="${classMap({hidden: !this._hasRepoRef()})}">
          <h3 class="label">${this._('Call Number')}</h3>
          <p>
            <grampsjs-form-string
              fullwidth
              id="reporef-call-number"
              value="${this.data?.reporef_list?.[0]?.call_number ?? ''}"
              ?disabled="${!this._hasRepoRef()}"
            ></grampsjs-form-string>
          </p>

          <h3 class="label">${this._('_Media Type:').replace(':', '')}</h3>
          <grampsjs-form-select-type
            ?disabled="${!this._hasRepoRef()}"
            id="reporef-media-type"
            heading=" "
            .appState="${this.appState}"
            ?loadingTypes="${this.loadingTypes}"
            typeName="source_media_types"
            defaultValue="Unknown"
            .types="${this.types}"
            .typesLocale="${this.typesLocale}"
          >
          </grampsjs-form-select-type>
        </div>

        <h3 class="label">${this._('Media')}</h3>
        <grampsjs-form-select-object-list
          multiple
          id="object-media"
          objectType="media"
          .appState="${this.appState}"
        ></grampsjs-form-select-object-list>

        ${this._renderTagsForm()}

        <div class="spacer"></div>
        <grampsjs-form-private
          id="private"
          .appState="${this.appState}"
        ></grampsjs-form-private>
      `
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
      if (originalTarget.id === 'reporef-call-number') {
        this._updateRepoRef({call_number: e.detail.data})
      }
      if (originalTarget.id === 'reporef-media-type') {
        this._updateRepoRef({media_type: e.detail.data})
      }
    }

    _updateRepoRef(changes) {
      if (!this._hasRepoRef()) return
      this.data = {
        ...this.data,
        reporef_list: [{...this.data.reporef_list[0], ...changes}],
      }
    }

    checkFormValidity() {
      const name = this.shadowRoot.getElementById('source-name')
      name?.reportValidity()
      try {
        this.isFormValid = name.validity.valid && !!name.value.trim()
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
