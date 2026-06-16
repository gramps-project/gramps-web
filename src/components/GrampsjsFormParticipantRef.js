import {html} from 'lit'
import './GrampsjsFormSelectType.js'
import './GrampsjsFormSelectObjectList.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'
import {personTitleFromProfile, familyTitleFromProfile} from '../util.js'

class GrampsjsFormParticipantRef extends GrampsjsObjectForm {
  renderForm() {
    return html`
      <grampsjs-form-select-object-list
        fixedMenuPosition
        style="min-height: 300px;"
        objectType="person,family"
        .appState="${this.appState}"
        id="person-select"
        label="${this._('Select')}"
      ></grampsjs-form-select-object-list>
      <grampsjs-form-select-type
        required
        id="event-role-type"
        defaultValue="Primary"
        heading="${this._('Role')}"
        .appState="${this.appState}"
        typeName="event_role_types"
        ?loadingTypes="${this.loadingTypes}"
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
        value="${this.data?.role?.string || this.data?.role || ''}"
      ></grampsjs-form-select-type>
    `
  }

  _handleFormData(e) {
    super._handleFormData(e)
    const originalTarget = e.composedPath()[0]
    if (originalTarget.id === 'person-select-list') {
      const obj = originalTarget.objects?.[0]
      if (obj) {
        const profile = obj.object?.profile ?? {}
        const label =
          obj.object_type === 'family'
            ? familyTitleFromProfile(profile)
            : personTitleFromProfile(profile)
        this.data = {
          ...this.data,
          object_type: obj.object_type,
          label,
          backlink: obj.object ?? {},
        }
      } else {
        this.data = Object.fromEntries(
          Object.entries(this.data).filter(
            ([k]) => !['object_type', 'label', 'backlink'].includes(k)
          )
        )
      }
    }
  }

  get isValid() {
    return !!this.data.ref
  }
}

window.customElements.define(
  'grampsjs-form-participant-ref',
  GrampsjsFormParticipantRef
)
