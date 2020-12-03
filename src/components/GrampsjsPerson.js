import { html, css } from 'lit-element';
import { GrampsjsObject } from './GrampsjsObject.js'
import './GrampsJsImage.js'


export class GrampsjsPerson extends GrampsjsObject {
  static get styles() {
    return [
      super.styles,
      css`
    `];
  }

  renderProfile() {
    return html`
    <h2>${this._displayName()}</h2>
    `;
  }

  renderPicture() {
    if (!this.data?.media_list?.length) {
      return html``
    }
    const ref = this.data.media_list[0]
    const obj = this.data.extended.media[0]
    return html`
      <grampsjs-img
        handle="${obj.handle}"
        size="175"
      .rect="${ref.rect || []}"
        square
        circle
        mime="${obj.mime}"
      ></grampsjs-img>
    `
  }

  _displayName() {
    if (!this.data.profile) {
      return ''
    }
    const surname = this.data.profile.name_surname || html`&hellip;`
    const given = this.data.profile.name_given || html`&hellip;`
    return html`${given} ${surname}`
  }

  _getProfileEvent(type) {
    if (!(this.data.profile && this.data.profile.events)) {
      return '';
    }
    for (const event of this.data.profile.events) {
      if (event.type === type) {
        return html`${event.date} ${this._('in')} ${event.place}`
      }
    }
    return '';
  }

}


window.customElements.define('grampsjs-person', GrampsjsPerson);
