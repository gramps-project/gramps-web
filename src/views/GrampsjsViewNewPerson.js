import {html} from 'lit'

import {GrampsjsViewNewObject} from './GrampsjsViewNewObject.js'
import '../components/GrampsjsFormName.js'
import '../components/GrampsjsFormPrivate.js'
import '../components/GrampsjsFormSelectObjectList.js'
import {makeHandle} from '../util.js'
import {apiPost} from '../api.js'

const gender = {
  2: 'Unknown',
  1: 'Male',
  0: 'Female'
}

const dataDefault = {_class: 'Person', gender: 2}

export class GrampsjsViewNewPerson extends GrampsjsViewNewObject {
  constructor () {
    super()
    this.data = dataDefault
    this.postUrl = '/api/objects/'
    this.itemPath = 'person'
  }

  renderContent () {
    return html`
    <h2>${this._('New Person')}</h2>

    <h4 class="label">${this._('Name')}</h4>
    <grampsjs-form-name
      id="primary-name"
      .strings="${this.strings}"
    ></grampsjs-form-name>

    <h4 class="label">${this._('Gender')}</h4>
    <mwc-select
      id="select-confidence"
      @change="${this.handleGender}"
    >
      ${Object.keys(gender).map(genderConst => html`
      <mwc-list-item
        value="${genderConst}"
        ?selected="${genderConst == this.data.gender}"
      >${this._(gender[genderConst])}</mwc-list-item>
      `)}
    </mwc-select>

    <h4 class="label">${this._('Birth Date')}</h4>

    <p>
      <grampsjs-form-select-date
        id="birth-date"
        .strings="${this.strings}"
      >
      </grampsjs-form-select-date>
    </p>

    <h4 class="label">${this._('Birth Place')}</h4>

    <grampsjs-form-select-object-list
      id="birth-place"
      objectType="place"
      .strings="${this.strings}"
    ></grampsjs-form-select-object-list>

    <h4 class="label">${this._('Death Date')}</h4>

    <p>
      <grampsjs-form-select-date
        id="death-date"
        .strings="${this.strings}"
      >
      </grampsjs-form-select-date>
    </p>

    <h4 class="label">${this._('Death Place')}</h4>


    <grampsjs-form-select-object-list
      id="death-place"
      objectType="place"
      .strings="${this.strings}"
    ></grampsjs-form-select-object-list>


    <div class="spacer"></div>
    <grampsjs-form-private id="private" .strings="${this.strings}"></grampsjs-form-private>

    ${this.renderButtons()}
    <pre>${JSON.stringify(this.data, null, 2)}</pre>
    `
    // <pre>${JSON.stringify(this.data, null, 2)}</pre>
  }

  handleGender (e) {
    this.data = {...this.data, gender: parseInt(e.target.value, 10)}
  }

  _handleFormData (e) {
    super._handleFormData(e)
    const originalTarget = e.composedPath()[0]
    if (originalTarget.id === 'primary-name') {
      this.data = {...this.data, primary_name: e.detail.data}
    }
    if (originalTarget.id === 'birth-date') {
      this.data = {...this.data, birth: {...this.data.birth, date: e.detail.data}}
    }
    if (originalTarget.id === 'birth-place-list') {
      this.data = {...this.data, birth: {...this.data.birth, place: e.detail.data[0]}}
    }
    if (originalTarget.id === 'death-date') {
      this.data = {...this.data, death: {...this.data.death, date: e.detail.data}}
    }
    if (originalTarget.id === 'death-place-list') {
      this.data = {...this.data, death: {...this.data.death, place: e.detail.data[0]}}
    }
    this.checkFormValidity()
  }

  _processedData () {
    const handlePerson = makeHandle()
    const handleBirth = makeHandle()
    const handleDeath = makeHandle()
    const birthString = this.translateTypeName(false, 'event_types', 'Birth')
    const deathString = this.translateTypeName(false, 'event_types', 'Death')
    const {birth, death, ...person} = this.data
    const hasBirth = (birth.place || birth?.date?._class)
    const hasDeath = (death.place || death?.date?._class)
    if (!hasBirth && !hasDeath) {
      return [person]
    }
    if (!hasDeath) {
      return [
        {
          ...person,
          handle: handlePerson,
          event_ref_list: [
            {_class: 'EventRef', ref: handleBirth}
          ],
          birth_ref_index: 0
        },
        {
          ...birth,
          _class: 'Event',
          handle: handleBirth,
          type:
      {_class: 'EventType', string: birthString}
        }
      ]
    }
    if (!hasBirth) {
      return [
        {
          ...person,
          handle: handlePerson,
          event_ref_list: [
            {_class: 'EventRef', ref: handleDeath}
          ],
          death_ref_index: 0
        },
        {
          ...death,
          _class: 'Event',
          handle: handleDeath,
          type:
        {_class: 'EventType', string: deathString}
        }
      ]
    }
    return [
      {
        ...person,
        handle: handlePerson,
        event_ref_list: [
          {_class: 'EventRef', ref: handleBirth},
          {_class: 'EventRef', ref: handleDeath}
        ],
        birth_ref_index: 0,
        death_ref_index: 1
      },
      {
        ...birth,
        _class: 'Event',
        handle: handleBirth,
        type:
      {_class: 'EventType', string: birthString}
      },
      {
        ...death,
        _class: 'Event',
        handle: handleDeath,
        type:
      {_class: 'EventType', string: deathString}
      }
    ]
  }

  _submit () {
    const processedData = this._processedData()
    apiPost(this.postUrl, processedData).then(data => {
      if ('data' in data) {
        this.error = false
        const grampsId = data.data.filter(obj => obj.new._class === 'Person')[0].new.gramps_id
        this.dispatchEvent(new CustomEvent('nav', {bubbles: true, composed: true, detail: {path: this._getItemPath(grampsId)}}))
        this._reset()
      } else if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
      }
    })
  }

  checkFormValidity () {
    this.isFormValid = true
  }

  _reset () {
    super._reset()
    this.data = dataDefault
  }
}

window.customElements.define('grampsjs-view-new-person', GrampsjsViewNewPerson)
