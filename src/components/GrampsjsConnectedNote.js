import {html} from 'lit'
import {GrampsjsConnectedComponent} from './GrampsjsConnectedComponent.js'
import './GrampsjsNoteContent.js'

const BASE_DIR = ''

export class GrampsjsConnectedNote extends GrampsjsConnectedComponent {
  static get properties() {
    return {
      handle: {type: String},
    }
  }

  constructor() {
    super()
    this.handle = ''
  }

  getUrl() {
    if (!this.handle) {
      return ''
    }
    const options = {
      link_format: `${BASE_DIR}/{obj_class}/{gramps_id}`,
    }
    return `/api/notes/${this.handle}?locale=${
      this.strings?.__lang__ || 'en'
    }&profile=all&extend=all&formats=html&format_options=${encodeURIComponent(
      JSON.stringify(options)
    )}`
  }

  renderContent() {
    return html`
      <grampsjs-note-content
        framed
        .strings="${this.strings}"
        grampsId="${this._data.data.gramps_id}"
        content="${this._data?.data?.formatted?.html ||
        this._data?.data?.text?.string}"
      ></grampsjs-note-content>
    `
  }

  // eslint-disable-next-line class-methods-use-this
  renderLoading() {
    const skeleton =
      '<p><span class="skeleton" style="width:100%;">&nbsp;</span></p>'
    return html` <grampsjs-note-content
      framed
      content="${skeleton}"
    ></grampsjs-note-content>`
  }

  update(changed) {
    super.update(changed)
    if (changed.has('handle')) {
      this._updateData()
    }
  }
}

window.customElements.define('grampsjs-connected-note', GrampsjsConnectedNote)
