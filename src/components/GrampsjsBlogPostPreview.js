import {html, css, LitElement} from 'lit'
import {sharedStyles} from '../SharedStyles.js'
import '@material/mwc-button'

import './GrampsJsImage.js'
import './GrampsjsGallery.js'
import './GrampsjsNoteContent.js'
import './GrampsjsTimedelta.js'
import {GrampsjsTranslateMixin} from '../mixins/GrampsjsTranslateMixin.js'

export class GrampsjsBlogPostPreview extends GrampsjsTranslateMixin(
  LitElement
) {
  static get styles() {
    return [
      sharedStyles,
      css`
        h3 {
          font-family: var(--grampsjs-heading-font-family);
          font-size: 20px;
          margin-bottom: 20px;
          font-weight: 400;
          margin-top: 0;
          line-height: 1.3em;
          min-height: 2.6em;
          color: rgba(0, 0, 0, 0.75);
        }

        #image {
          width: 170px;
          flex-shrink: 0;
          text-align: right;
        }

        #note {
          flex-grow: 1;
          font-size: 17px;
          font-weight: 300;
          color: rgba(0, 0, 0, 0.7);
          line-height: 1.45em;
        }

        #date {
          color: rgba(0, 0, 0, 0.6);
          font-size: 14px;
          letter-spacing: 0.02em;
          margin: 2em 0;
          font-weight: 250;
        }

        .clear {
          clear: both;
        }

        #content {
          display: flex;
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Object},
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
        <h3>${this.data.title}</h3>
        <div id="content">
          <div id="note">${this.getPreviewText()}</div>
          ${this.data?.media_list?.length ? this._renderImage() : ''}
        </div>
        <div class="clear"></div>
        <div id="date">
          ${this.strings.__lang__
            ? html`<grampsjs-timedelta
                timestamp="${this.data.change}"
                locale="${this.strings.__lang__}"
              ></grampsjs-timedelta>`
            : ''}
        </div>
      </div>
    `
  }

  getPreviewText() {
    const all = this.data?.extended?.notes[0]?.text?.string
    if (!all) {
      return ''
    }
    const re = /[\s\S]{250}[^\s]{0,50}\s?/g
    const match = all.match(re)
    if (match === null) {
      return all
    }
    return `${match[0]} ...`
  }

  _renderImage() {
    const ref = this.data.media_list[0]
    const obj = this.data.extended.media[0]
    return html`
      <div id="image">
        <grampsjs-img
          handle="${obj.handle}"
          size="150"
          displayHeight="150"
          square
          .rect="${ref.rect || []}"
          mime="${obj.mime}"
        ></grampsjs-img>
      </div>
    `
  }
}

window.customElements.define(
  'grampsjs-blog-post-preview',
  GrampsjsBlogPostPreview
)
