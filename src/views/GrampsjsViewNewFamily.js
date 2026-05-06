import {html, css} from 'lit'

import {mdiClose, mdiPlus} from '@mdi/js'

import {GrampsjsViewNewObject} from './GrampsjsViewNewObject.js'
import {clearDraftsWithPrefix} from '../api.js'
import '../components/GrampsjsFormPrivate.js'
import '../components/GrampsjsFormPersonSlot.js'
import '../components/GrampsjsIcon.js'
import '@material/web/button/outlined-button.js'
import '@material/web/iconbutton/icon-button.js'

const dataDefault = {_class: 'Family'}

export class GrampsjsViewNewFamily extends GrampsjsViewNewObject {
  static get styles() {
    return [
      super.styles,
      css`
        .child-slot-wrapper {
          border: 1px solid var(--md-sys-color-outline-variant, #ccc);
          border-radius: 8px;
          padding: 1em 1.25em;
          margin-bottom: 1em;
        }

        .child-slot-header {
          display: flex;
          justify-content: flex-end;
        }
      `,
    ]
  }

  static get properties() {
    return {
      _childKeys: {type: Array, state: true},
    }
  }

  constructor() {
    super()
    this.data = dataDefault
    this.postUrl = '/api/objects/'
    this.itemPath = 'family'
    this.objClass = 'Family'
    this._childKeys = []
    this._nextChildKey = 0
  }

  renderContent() {
    return html`
      <h2>${this._('New Family')}</h2>

      <h3>${this._('Father')}</h3>

      <grampsjs-form-person-slot
        id="father-slot"
        role="father"
        .appState="${this.appState}"
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
        ?loadingTypes="${this.loadingTypes}"
      ></grampsjs-form-person-slot>

      <h3>${this._('Mother')}</h3>

      <grampsjs-form-person-slot
        id="mother-slot"
        role="mother"
        .appState="${this.appState}"
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
        ?loadingTypes="${this.loadingTypes}"
      ></grampsjs-form-person-slot>

      <h3>${this._('Children')}</h3>

      ${this._childKeys.map(
        key => html`
          <div class="child-slot-wrapper">
            <div class="child-slot-header">
              <md-icon-button @click="${() => this._removeChild(key)}">
                <grampsjs-icon
                  path="${mdiClose}"
                  color="var(--mdc-theme-secondary)"
                ></grampsjs-icon>
              </md-icon-button>
            </div>
            <grampsjs-form-person-slot
              id="child-slot-${key}"
              role="child"
              showRelTypes
              .appState="${this.appState}"
              .types="${this.types}"
              .typesLocale="${this.typesLocale}"
              ?loadingTypes="${this.loadingTypes}"
            ></grampsjs-form-person-slot>
          </div>
        `
      )}

      <md-outlined-button @click="${this._addChild}">
        <grampsjs-icon slot="icon" path="${mdiPlus}"></grampsjs-icon>
        ${this._('Add child')}
      </md-outlined-button>

      <h3>${this._('Relationship type:').replace(':', '')}</h3>

      <grampsjs-form-select-type
        noheading
        id="family-rel-type"
        .appState="${this.appState}"
        ?loadingTypes="${this.loadingTypes}"
        typeName="family_relation_types"
        defaultValue="Unknown"
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
      >
      </grampsjs-form-select-type>

      ${this._renderCitationForm()} ${this._renderTagsForm()}

      <div class="spacer"></div>
      <grampsjs-form-private
        id="private"
        .appState="${this.appState}"
      ></grampsjs-form-private>

      ${this.renderButtons()}
    `
  }

  firstUpdated() {
    this.updateComplete.then(() => this.checkFormValidity())
  }

  _addChild() {
    this._childKeys = [...this._childKeys, this._nextChildKey]
    this._nextChildKey += 1
    this.updateComplete.then(() => this.checkFormValidity())
  }

  _removeChild(key) {
    this._childKeys = this._childKeys.filter(k => k !== key)
    this.updateComplete.then(() => this.checkFormValidity())
  }

  _handleFormData(e) {
    super._handleFormData(e)
    const originalTarget = e.composedPath()[0]
    if (originalTarget.id === 'family-rel-type') {
      this.data = {...this.data, type: e.detail.data}
    }
    this.checkFormValidity()
  }

  checkFormValidity() {
    const slots = [
      ...this.shadowRoot.querySelectorAll('grampsjs-form-person-slot'),
    ]
    this.isFormValid =
      slots.every(slot => slot.checkValidity()) &&
      slots.some(slot => !slot.isEmpty())
  }

  _submit() {
    const fatherSlot = this.shadowRoot.querySelector('#father-slot')
    const motherSlot = this.shadowRoot.querySelector('#mother-slot')

    const fatherData = fatherSlot.getData()
    const motherData = motherSlot.getData()

    const newPersonObjects = []

    let fatherHandle = null
    if (fatherData?.handle) {
      fatherHandle = fatherData.handle
    } else if (fatherData?.newPersonData) {
      newPersonObjects.push(...fatherData.newPersonData)
      fatherHandle = fatherData.newPersonData[0].handle
    }

    let motherHandle = null
    if (motherData?.handle) {
      motherHandle = motherData.handle
    } else if (motherData?.newPersonData) {
      newPersonObjects.push(...motherData.newPersonData)
      motherHandle = motherData.newPersonData[0].handle
    }

    const childRefList = []
    for (const key of this._childKeys) {
      const slot = this.shadowRoot.querySelector(`#child-slot-${key}`)
      const childData = slot.getData()
      if (childData?.handle) {
        childRefList.push({
          _class: 'ChildRef',
          ref: childData.handle,
          frel: childData.frel,
          mrel: childData.mrel,
        })
      } else if (childData?.newPersonData) {
        newPersonObjects.push(...childData.newPersonData)
        childRefList.push({
          _class: 'ChildRef',
          ref: childData.newPersonData[0].handle,
          frel: childData.frel,
          mrel: childData.mrel,
        })
      }
    }

    const familyObj = {
      ...this.data,
      _class: 'Family',
      father_handle: fatherHandle,
      mother_handle: motherHandle,
      child_ref_list: childRefList,
    }

    const payload = [...newPersonObjects, familyObj]

    this.appState.apiPost('/api/objects/', payload).then(data => {
      if ('data' in data) {
        this.error = false
        const grampsId = data.data.filter(obj => obj.new._class === 'Family')[0]
          .new.gramps_id

        const {page, pageId} = this.appState?.path || {page: '', pageId: ''}
        clearDraftsWithPrefix(`${page}:${pageId}:`)

        this.dispatchEvent(
          new CustomEvent('nav', {
            bubbles: true,
            composed: true,
            detail: {path: `family/${grampsId}`},
          })
        )
        this._reset()
      } else if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
      }
    })
  }

  _reset() {
    super._reset()
    this.data = dataDefault
    this._childKeys = []
    this._nextChildKey = 0
    this.shadowRoot
      .querySelectorAll('grampsjs-form-person-slot')
      .forEach(slot => slot.reset())
  }
}

window.customElements.define('grampsjs-view-new-family', GrampsjsViewNewFamily)
