import {html} from 'lit'

import '@material/mwc-textfield'

import '../components/GrampsjsFormSelectDate.js'
import '../components/GrampsjsFormSelectObjectList.js'
import '../components/GrampsjsFormSelectType.js'
import '../components/GrampsjsFormPrivate.js'

export const GrampsjsNewEventMixin = superClass =>
  class extends superClass {
    renderForm() {
      return html`
        <grampsjs-form-select-type
          required
          id="event-type"
          .appState="${this.appState}"
          ?loadingTypes="${this.loadingTypes}"
          typeName="event_types"
          .types="${this.types}"
          .typesLocale="${this.typesLocale}"
        >
        </grampsjs-form-select-type>

        <h4 class="label">${this._('Date')}</h4>
        <p>
          <grampsjs-form-select-date id="date" .appState="${this.appState}">
          </grampsjs-form-select-date>
        </p>

        <h4 class="label">${this._('Description')}</h4>
        <p>
          <grampsjs-form-string
            fullwidth
            id="description"
            @formdata:changed="${this._handleFormData}"
            label="${this._('Description')}"
            .appState="${this.appState}"
          >
          </grampsjs-form-string>
        </p>

        <h4 class="label">${this._('Place')}</h4>
        <grampsjs-form-select-object-list
          id="place"
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
  }
