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
        <pre>${JSON.stringify(this.data, null, 2)}</pre>
        <grampsjs-form-select-type
          required
          id="event-type"
          .strings="${this.strings}"
          ?loadingTypes="${this.loadingTypes}"
          typeName="event_types"
          .types="${this.types}"
          .typesLocale="${this.typesLocale}"
        >
        </grampsjs-form-select-type>

        <h4 class="label">${this._('Date')}</h4>
        <p>
          <grampsjs-form-select-date id="date" .strings="${this.strings}">
          </grampsjs-form-select-date>
        </p>

        <h4 class="label">${this._('Description')}</h4>
        <p>
          <grampsjs-form-string
            fullwidth
            id="description"
            @formdata:changed="${this._handleFormData}"
            label="${this._('Description')}"
            .strings="${this.strings}"
          >
          </grampsjs-form-string>
        </p>

        <h4 class="label">${this._('Place')}</h4>
        <grampsjs-form-select-object-list
          id="place"
          objectType="place"
          .strings="${this.strings}"
        ></grampsjs-form-select-object-list>

        <div class="spacer"></div>
        <grampsjs-form-private
          id="private"
          .strings="${this.strings}"
        ></grampsjs-form-private>
      `
    }
  }
