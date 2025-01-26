import {html, css} from 'lit'

import '@material/mwc-textfield'
import '@material/mwc-icon'
import '@material/mwc-switch'

import '../components/GrampsjsFormSelectDate.js'
import '../components/GrampsjsFormSelectObjectList.js'
import '../components/GrampsjsFormSelectType.js'
import '../components/GrampsjsFormPrivate.js'

import {makeHandle, dateIsEmpty} from '../util.js'

const dataDefault = {_class: 'Person', gender: 2, citation_list: []}

const gender = {
  2: 'Unknown',
  1: 'Male',
  0: 'Female',
}

export const GrampsjsNewPersonMixin = (
  superClass,
  {allowCreate = true, allowLink = false}
) =>
  class extends superClass {
    static get properties() {
      return {
        data: {type: Object},
        showCreate: {type: Boolean},
      }
    }

    constructor() {
      super()
      this.data = dataDefault
      this.showCreate = allowCreate
      this.showToggle = allowCreate && allowLink
    }

    handleGender(e) {
      this.data = {...this.data, gender: parseInt(e.target.value, 10)}
    }

    renderForm() {
      return html`
        ${this.showToggle
          ? html`
              <div class="option">
                <mwc-switch
                  id="button-show-more"
                  @click="${this._toggleCreateNew}"
                  ?selected="${this.showCreate}"
                ></mwc-switch>
                <span class="label">Create New Person</span>
              </div>
            `
          : ''}
        ${this.showCreate
          ? html` <div>
              <h4 class="label">${this._('Name')}</h4>
              <grampsjs-form-name
                id="primary-name"
                .strings="${this.strings}"
              ></grampsjs-form-name>

              <h4 class="label">${this._('Gender')}</h4>
              <mwc-select id="select-confidence" @change="${this.handleGender}">
                ${Object.keys(gender).map(
                  genderConst => html`
                    <mwc-list-item
                      value="${genderConst}"
                      ?selected="${
                        // eslint-disable-next-line eqeqeq
                        genderConst == this.data.gender
                      }"
                      >${this._(gender[genderConst])}</mwc-list-item
                    >
                  `
                )}
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

              ${this._renderCitationForm()}

              <div class="spacer"></div>
              <grampsjs-form-private
                id="private"
                .strings="${this.strings}"
              ></grampsjs-form-private>
            </div>`
          : html`
              <grampsjs-form-select-object-list
                fixedMenuPosition
                style="min-height: 300px;"
                objectType="person"
                .strings="${this.strings}"
                id="person-select"
                label="${this._('Select')}"
                class="edit"
              ></grampsjs-form-select-object-list>
            `}
      `
    }
    _toggleCreateNew() {
      this.showCreate = !this.showCreate
    }

    _handleFormData(e) {
      super._handleFormData(e)
      // TODO handle form data depending on link or create
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
      this.showCreate = false
      this.data = dataDefault
    }
  }
