import {html, css} from 'lit-element'

import '@material/mwc-icon'

import {GrampsjsObject} from './GrampsjsObject.js'


export class GrampsjsSource extends GrampsjsObject {
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
    <h2><mwc-icon class="person">bookmarks</mwc-icon> ${this.data.title}</h2>
    <dl>
    ${this.data?.abbrev ? html`
      <div>
        <dt>${this._('Abbreviation')}</dt>
        <dd>${this.data.abbrev}</dd>
      </div>
      ` : ''}
    ${this.data?.author ? html`
      <div>
        <dt>${this._('Author')}</dt>
        <dd>${this.data.author}</dd>
      </div>
      ` : ''}
    ${this.data?.pubinfo ? html`
      <div>
        <dt>${this._('Publication info')}</dt>
        <dd>${this.data.pubinfo}</dd>
      </div>
      ` : ''}
    </dl>
    `
  }

  renderPicture() {
    return ''
  }

}


window.customElements.define('grampsjs-source', GrampsjsSource)
