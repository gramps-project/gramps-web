import {html, LitElement} from 'lit'
import {sharedStyles} from '../SharedStyles.js'

import './GrampsJsImage.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'


export class GrampsjsBlogPreview extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles
    ]
  }

  static get properties() {
    return {
      data: {type: Object}
    }
  }

  constructor() {
    super()
    this.data = {}
  }

  render() {
    if (Object.keys(this.data).length === 0) {
      return html``
    }
    return html`
    <div class="blog-preview">
      <h2>${this.data.title}</h2>
      <h3>${this.data.author}</h3>
      ${this.data?.extended?.notes?.length ? this._renderNoteSnippet() : ''}
      ${this.data?.media_list?.length ? this._renderImage() : ''}
    </div>
    `
  }

  _renderNoteSnippet() {
    const note = this.data.extended.notes[0]
    return html`
    <p>${note?.text?.string || ''}</p>
    `
  }

  _renderImage() {
    const ref = this.data.media_list[0]
    const obj = this.data.extended.media[0]
    return html`
      <grampsjs-img
        handle="${obj.handle}"
        size="200"
        displayHeight="200"
      .rect="${ref.rect || []}"
        square
        mime="${obj.mime}"
      ></grampsjs-img>
    `
  }

}


window.customElements.define('grampsjs-blog-preview', GrampsjsBlogPreview)
