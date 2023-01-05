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
            id="note-editor"
          ></grampsjs-editor>
        </p>

        <grampsjs-form-select-type
          id="select-note-type"
          .strings="${this.strings}"
          ?loadingTypes="${this.loadingTypes}"
          typeName="note_types"
          defaultTypeName="General"
          .types="${this.types}"
          .typesLocale="${this.typesLocale}"
        >
        </grampsjs-form-select-type>

        <div class="spacer"></div>
        <grampsjs-form-private
          id="private"
          .strings="${this.strings}"
        ></grampsjs-form-private>
      `
    }
  }
