import {html} from 'lit'

import '../components/GrampsjsFormString.js'
import '../components/GrampsjsFormPrivate.js'
import '../components/GrampsjsFormUpload.js'

export const GrampsjsNewMediaMixin = superClass =>
  class extends superClass {
    renderForm() {
      return html`
        <h4 class="label">${this._('File')}</h4>
        <p>
          <grampsjs-form-upload
            preview
            id="upload"
            .appState="${this.appState}"
          ></grampsjs-form-upload>
        </p>

        <h4 class="label">${this._('Title')}</h4>
        <p>
          <grampsjs-form-string
            ?disabled="${!this.isFormValid}"
            value="${this.data.desc}"
            fullwidth
            id="desc"
          ></grampsjs-form-string>
        </p>

        <h4 class="label">${this._('Date')}</h4>
        <p>
          <grampsjs-form-select-date id="date" .appState="${this.appState}">
          </grampsjs-form-select-date>
        </p>

        <div class="spacer"></div>
        <grampsjs-form-private
          id="private"
          .appState="${this.appState}"
        ></grampsjs-form-private>
      `
    }
  }
