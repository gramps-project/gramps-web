import {html} from 'lit'

import '../components/GrampsjsFormSelectType.js'
import '../components/GrampsjsFormPrivate.js'
import '../components/GrampsjsEditor.js'

export const GrampsjsNewNoteMixin = superClass =>
  class extends superClass {
    renderForm() {
      return html`
        <p>
          <grampsjs-editor
            @formdata:changed="${this.handleEditor}"
            @keydown="${e => e.stopImmediatePropagation()}"
            id="new-note-editor"
            .appState="${this.appState}"
          ></grampsjs-editor>
        </p>

        <grampsjs-form-select-type
          id="select-note-type"
          .appState="${this.appState}"
          ?loadingTypes="${this.loadingTypes}"
          typeName="note_types"
          .types="${this.types}"
          .typesLocale="${this.typesLocale}"
        >
        </grampsjs-form-select-type>

        <div class="spacer"></div>
        <grampsjs-form-private
          id="private"
          .appState="${this.appState}"
        ></grampsjs-form-private>
      `
    }
  }
