import {html} from 'lit'

import '../components/GrampsjsFormName.js'
import '../components/GrampsjsFormPrivate.js'
import '../components/GrampsjsFormSelectObjectList.js'
import {GrampsjsViewNewObject} from './GrampsjsViewNewObject.js'
import {GrampsjsNewPersonMixin} from '../mixins/GrampsjsNewPersonMixin.js'
import {makeHandle, dateIsEmpty} from '../util.js'
import {apiPost} from '../api.js'

const dataDefault = {_class: 'Person', gender: 2, citation_list: []}

export class GrampsjsViewNewPerson extends GrampsjsNewPersonMixin(
  GrampsjsViewNewObject
) {
  constructor() {
    super()
    this.data = dataDefault
    this.postUrl = '/api/objects/'
    this.itemPath = 'person'
    this.objClass = 'Person'
  }

  renderContent() {
    return html`
      <h2>${this._('New Person')}</h2>
      ${this.renderForm()} ${this.renderButtons()}
    `
    // <pre>${JSON.stringify(this.data, null, 2)}</pre>
  }

  _handleFormData(e) {
    super._handleFormData(e)
    const originalTarget = e.composedPath()[0]
    if (originalTarget.id === 'primary-name') {
      this.data = {...this.data, primary_name: e.detail.data}
    }
    if (originalTarget.id === 'birth-date') {
      this.data = {
        ...this.data,
        birth: {...this.data.birth, date: e.detail.data},
      }
    }
    if (originalTarget.id === 'birth-place-list') {
      this.data = {
        ...this.data,
        birth: {...this.data.birth, place: e.detail.data[0]},
      }
    }
    if (originalTarget.id === 'death-date') {
      this.data = {
        ...this.data,
        death: {...this.data.death, date: e.detail.data},
      }
    }
    if (originalTarget.id === 'death-place-list') {
      this.data = {
        ...this.data,
        death: {...this.data.death, place: e.detail.data[0]},
      }
    }
    this.checkFormValidity()
  }

  _processedData() {
    const handlePerson = makeHandle()
    const handleBirth = makeHandle()
    const handleDeath = makeHandle()
    const birthString = this.translateTypeName(false, 'event_types', 'Birth')
    const deathString = this.translateTypeName(false, 'event_types', 'Death')
    const {birth, death, ...person} = this.data
    const hasBirth = birth.place || (birth?.date && !dateIsEmpty(birth.date))
    const hasDeath = death.place || (death?.date && !dateIsEmpty(birth.date))
    if (!hasBirth && !hasDeath) {
      return [person]
    }
    if (!hasDeath) {
      return [
        {
          ...person,
          handle: handlePerson,
          event_ref_list: [{_class: 'EventRef', ref: handleBirth}],
          birth_ref_index: 0,
        },
        {
          ...birth,
          _class: 'Event',
          handle: handleBirth,
          type: {_class: 'EventType', string: birthString},
          citation_list: person.citation_list ?? [],
        },
      ]
    }
    if (!hasBirth) {
      return [
        {
          ...person,
          handle: handlePerson,
          event_ref_list: [{_class: 'EventRef', ref: handleDeath}],
          death_ref_index: 0,
        },
        {
          ...death,
          _class: 'Event',
          handle: handleDeath,
          type: {_class: 'EventType', string: deathString},
          citation_list: person.citation_list ?? [],
        },
      ]
    }
    return [
      {
        ...person,
        handle: handlePerson,
        event_ref_list: [
          {_class: 'EventRef', ref: handleBirth},
          {_class: 'EventRef', ref: handleDeath},
        ],
        birth_ref_index: 0,
        death_ref_index: 1,
      },
      {
        ...birth,
        _class: 'Event',
        handle: handleBirth,
        type: {_class: 'EventType', string: birthString},
        citation_list: person.citation_list ?? [],
      },
      {
        ...death,
        _class: 'Event',
        handle: handleDeath,
        type: {_class: 'EventType', string: deathString},
        citation_list: person.citation_list ?? [],
      },
    ]
  }

  _submit() {
    const processedData = this._processedData()
    apiPost(this.postUrl, processedData).then(data => {
      if ('data' in data) {
        this.error = false
        const grampsId = data.data.filter(obj => obj.new._class === 'Person')[0]
          .new.gramps_id
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

  checkFormValidity() {
    let valid = true
    this.shadowRoot
      .querySelectorAll('grampsjs-form-select-date')
      .forEach(element => {
        if (!element.isValid()) {
          valid = false
        }
      })
    this.isFormValid = valid
  }

  _reset() {
    super._reset()
    this.data = dataDefault
  }
}

window.customElements.define('grampsjs-view-new-person', GrampsjsViewNewPerson)
