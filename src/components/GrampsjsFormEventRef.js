/*
Form for adding a new event reference
*/

import {html, css} from 'lit'

import './GrampsjsFormSelectType.js'
import './GrampsjsFormSelectObjectList.js'
import './GrampsjsFormString.js'
import './GrampsjsAttributes.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'
import {
  participantIntroStyles,
  renderParticipantIntro,
} from './participantRow.js'

/*
The attribute list after an action of the attributes editor in the dialog,
or null for an action it does not handle
*/
export function changeRefAttributes(list, {action, data, index, to}) {
  const attrs = [...(list ?? [])]
  if (action === 'addAttribute') {
    return [...attrs, {_class: 'Attribute', ...data}]
  }
  if (index === undefined || index < 0 || index >= attrs.length) {
    return null
  }
  if (action === 'updateAttribute') {
    return attrs.map((attr, i) => (i === index ? {...attr, ...data} : attr))
  }
  if (action === 'delAttr') {
    return attrs.filter((_attr, i) => i !== index)
  }
  if (action === 'moveListItem' && to >= 0 && to < attrs.length) {
    const [moved] = attrs.splice(index, 1)
    attrs.splice(to, 0, moved)
    return attrs
  }
  return null
}

class GrampsjsFormEventRef extends GrampsjsObjectForm {
  static get styles() {
    return [
      ...super.styles,
      ...participantIntroStyles,
      css`
        h4.label {
          margin-top: 24px;
          margin-bottom: 0;
        }
      `,
    ]
  }

  static get properties() {
    return {
      defaultRole: {type: String},
      // the participant whose reference this edits, a row of
      // participantRefRows. Shows a sentence that the dialog
      // applies to this participant only, and editors for the privacy,
      // citations, notes and attributes of the reference.
      participant: {type: Object},
    }
  }

  constructor() {
    super()
    this.defaultRole = 'Primary'
    this.participant = null
  }

  renderForm() {
    return html`
      ${this.participant
        ? renderParticipantIntro(
            this.participant,
            this.appState,
            (...args) => this._(...args),
            {role: false}
          )
        : ''}
      ${!this.new // select event shown only for new event ref
        ? ''
        : html`
            <grampsjs-form-select-object-list
              fixedMenuPosition
              style="min-height: 300px;"
              objectType="event"
              .appState="${this.appState}"
              id="event-select"
              label="${this._('Select')}"
              class="edit"
              .data="${this.data}"
            ></grampsjs-form-select-object-list>
          `}
      <grampsjs-form-select-type
        required
        id="event-role-type"
        defaultValue="${this.defaultRole}"
        heading="${this._('Role')}"
        .appState="${this.appState}"
        typeName="event_role_types"
        ?loadingTypes=${this.loadingTypes}
        .types="${this.types}"
        .typesLocale="${this.typesLocale}"
        value="${this.data?.role?.string || this.data?.role || ''}"
      >
      </grampsjs-form-select-type>
      ${this.participant
        ? html`${this._renderDetails()} ${this.renderPrivate()}`
        : ''}
    `
  }

  _renderDetails() {
    return html`
      ${this._renderObjectList(
        'citation',
        'Citations',
        this.data.citation_list
      )}
      ${this._renderObjectList('note', 'Notes', this.data.note_list)}
      <h4 class="label">${this._('Attributes')}</h4>
      <grampsjs-attributes
        edit
        hasEdit
        attributeCategory="events"
        .appState="${this.appState}"
        .data="${this.data.attribute_list ?? []}"
        @edit:action="${this._handleAttributeAction}"
      ></grampsjs-attributes>
    `
  }

  _renderObjectList(objectType, heading, handles) {
    return html`
      <h4 class="label">${this._(heading)}</h4>
      <grampsjs-form-select-object-list
        multiple
        fixedMenuPosition
        objectType="${objectType}"
        .appState="${this.appState}"
        id="ref-${objectType}-select"
        label="${this._('Select')}"
        .objectsInitial="${(handles ?? []).map(handle => ({
          object_type: objectType,
          object: {},
          handle,
        }))}"
        class="edit"
      ></grampsjs-form-select-object-list>
    `
  }

  // Escape in the dialog of the attributes editor closes only that one
  _handleDialogKeydown(e) {
    const dialogs = e
      .composedPath()
      .filter(el => el.tagName === 'MD-DIALOG').length
    if (dialogs > 1) {
      return
    }
    super._handleDialogKeydown(e)
  }

  // the attributes editor fires edit actions meant for this dialog only
  _handleAttributeAction(e) {
    e.preventDefault()
    e.stopPropagation()
    const list = changeRefAttributes(this.data.attribute_list, e.detail)
    if (list) {
      this.data = {...this.data, attribute_list: list}
    }
  }

  _handleFormData(e) {
    const originalTarget = e.composedPath()[0]
    const key = {
      'ref-citation-select-list': 'citation_list',
      'ref-note-select-list': 'note_list',
    }[originalTarget.id]
    if (key) {
      this.data = {...this.data, [key]: e.detail.data ?? []}
    }
    super._handleFormData(e)
  }

  get isValid() {
    return !!this.data.ref
  }
}

window.customElements.define('grampsjs-form-eventref', GrampsjsFormEventRef)
