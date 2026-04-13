import {html} from 'lit'

import '../components/GrampsjsFormSelectType.js'
import '../components/GrampsjsFormPrivate.js'
import '../components/GrampsjsEditor.js'

// Default note type per object endpoint (DATAMAPIGNORE defaults in Gramps core).
// All values in this map are treated as object-specific types that should be
// hidden when viewing a different object type.
const NOTE_TYPE_FOR_OBJECT = {
  people: 'Person Note',
  families: 'Family Note',
  events: 'Event Note',
  sources: 'Source Note',
  places: 'Place Note',
  repositories: 'Repository Note',
  media: 'Media Note',
}

// All DATAMAPIGNORE types — never shown unless they are the context-specific
// default. Includes sub-object types (Address, Attribute, etc.) that have no
// dedicated notes UI in Gramps Web.
const ALL_OBJECT_NOTE_TYPES = new Set([
  ...Object.values(NOTE_TYPE_FOR_OBJECT),
  'Name Note',
  'Attribute Note',
  'Address Note',
  'Association Note',
  'LDS Note',
  'Event Reference Note',
  'Source Reference Note',
  'Repository Reference Note',
  'Media Reference Note',
  'Child Reference Note',
])

export const GrampsjsNewNoteMixin = superClass =>
  class extends superClass {
    static get properties() {
      return {
        ...super.properties,
        objType: {type: String},
      }
    }

    constructor() {
      super()
      this.objType = ''
    }

    get _noteDefaultType() {
      return NOTE_TYPE_FOR_OBJECT[this.objType] || 'General'
    }

    get _noteAllowedTypes() {
      const objectNoteType = NOTE_TYPE_FOR_OBJECT[this.objType]
      if (!objectNoteType) return []
      const allTypes = [
        ...(this.types?.default?.note_types || []),
        ...(this.types?.custom?.note_types || []),
      ]
      return allTypes.filter(
        t => !ALL_OBJECT_NOTE_TYPES.has(t) || t === objectNoteType
      )
    }

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
          defaultValue="${this._noteDefaultType}"
          .allowedTypes="${this._noteAllowedTypes}"
        >
        </grampsjs-form-select-type>

        ${this._renderTagsForm()}

        <div class="spacer"></div>
        <grampsjs-form-private
          id="private"
          .appState="${this.appState}"
        ></grampsjs-form-private>
      `
    }
  }
