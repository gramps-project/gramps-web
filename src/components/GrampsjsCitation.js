import {html, css} from 'lit-element'

import '@material/mwc-icon'

import {GrampsjsObject} from './GrampsjsObject.js'


export class GrampsjsCitation extends GrampsjsObject {
  static get styles() {
    return [
      super.styles,
      css`
      :host {
      }
    `]
  }


  renderProfile() {
    return html`
    <h2><mwc-icon class="person">bookmark</mwc-icon> ${this._('Citation')}</h2>

    <dl>
    ${this.data?.profile?.date ? html`
    <div>
      <dt>
        ${this._('Date')}
      </dt>
      <dd>
      ${this.data.profile.date}
      </dd>
    </div>
    ` : ''}
    <div>
      <dt>
        ${this._('Source')}
      </dt>
      <dd>
        <a href="/source/${this.data.extended.source.gramps_id}">${this.data.extended.source.title || this.data.extended.source.gramps_id}</a>
      </dd>
    </div>
    ${this.data?.page ? html`
    <div>
      <dt>
        ${this._('Page')}
      </dt>
      <dd>
      ${this.data.page}
      </dd>
    </div>
    ` : ''}
    </dl>
    `
  }

  renderPicture() {
    return ''
  }


}


window.customElements.define('grampsjs-citation', GrampsjsCitation)
