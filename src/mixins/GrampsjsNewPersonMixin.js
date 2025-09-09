import {html} from 'lit'

import {makeHandle, dateIsEmpty, emptyDate} from '../util.js'

import '../components/GrampsjsFormSelectObjectList.js'
import '../components/GrampsjsFormSelectDate.js'
import '../components/GrampsjsFormName.js'
import '../components/GrampsjsFormPrivate.js'

const dataDefault = {_class: 'Person', gender: 2, citation_list: []}

export const GrampsjsNewPersonMixin = superClass =>
  class extends superClass {
    constructor() {
      super()
      this.data = dataDefault
    }

    gender = {
      2: 'Unknown',
      1: 'Male',
      0: 'Female',
    }

    renderForm() {
      return html`
        <h4 class="label">${this._('Name')}</h4>
        <grampsjs-form-name
          id="primary-name"
          .appState="${this.appState}"
        ></grampsjs-form-name>

        <h4 class="label">${this._('Gender')}</h4>
        <mwc-select id="select-confidence" @change="${this.handleGender}">
          ${Object.keys(this.gender).map(
            genderConst => html`
              <mwc-list-item
                value="${genderConst}"
                ?selected="${
                  // eslint-disable-next-line eqeqeq
                  genderConst == this.data.gender
                }"
                >${this._(this.gender[genderConst])}</mwc-list-item
              >
            `
          )}
        </mwc-select>

        <h4 class="label">${this._('Birth Date')}</h4>

        <p>
          <grampsjs-form-select-date
            id="birth-date"
            .appState="${this.appState}"
          >
          </grampsjs-form-select-date>
        </p>

        <h4 class="label">${this._('Birth Place')}</h4>

        <grampsjs-form-select-object-list
          id="birth-place"
          objectType="place"
          .appState="${this.appState}"
        ></grampsjs-form-select-object-list>

        <h4 class="label">${this._('Death Date')}</h4>

        <p>
          <grampsjs-form-select-date
            id="death-date"
            .appState="${this.appState}"
          >
          </grampsjs-form-select-date>
        </p>

        <h4 class="label">${this._('Death Place')}</h4>

        <grampsjs-form-select-object-list
          id="death-place"
          objectType="place"
          .appState="${this.appState}"
        ></grampsjs-form-select-object-list>

        ${this._renderCitationForm()}

        <div class="spacer"></div>
        <grampsjs-form-private
          id="private"
          .appState="${this.appState}"
        ></grampsjs-form-private>
      `
    }

    _renderCitationForm() {
      return html`
        <h4 class="label">${this._('Citation')}</h4>

        <grampsjs-form-select-object-list
          multiple
          id="object-citation"
          objectType="citation"
          .appState="${this.appState}"
        ></grampsjs-form-select-object-list>
      `
    }

    handleGender(e) {
      this.data = {...this.data, gender: parseInt(e.target.value, 10)}
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
          birth: {...this.data.birth, date: e.detail.data ?? emptyDate},
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
          death: {...this.data.death, date: e.detail.data ?? emptyDate},
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

    _processedData() {
      const handlePerson = makeHandle()
      const handleBirth = makeHandle()
      const handleDeath = makeHandle()
      const birthString = this.translateTypeName(false, 'event_types', 'Birth')
      const deathString = this.translateTypeName(false, 'event_types', 'Death')
      const {birth, death, ...person} = this.data
      const hasBirth = birth.place || (birth?.date && !dateIsEmpty(birth.date))
      const hasDeath = death.place || (death?.date && !dateIsEmpty(death.date))
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
            type: birthString,
            citation_list: person.citation_list ?? [],
            private: person.private ?? false,
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
            type: deathString,
            citation_list: person.citation_list ?? [],
            private: person.private ?? false,
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
          type: birthString,
          citation_list: person.citation_list ?? [],
          private: person.private ?? false,
        },
        {
          ...death,
          _class: 'Event',
          handle: handleDeath,
          type: deathString,
          citation_list: person.citation_list ?? [],
          private: person.private ?? false,
        },
      ]
    }
  }
