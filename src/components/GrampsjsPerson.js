import { html, css, LitElement } from 'lit-element';

export class GrampsjsPerson extends LitElement {
  static get styles() {
    return css`
      :host {
        display: block;
        padding: 25px;
        color: var(--grampsjs-person-text-color, #000);
      }
    `;
  }

  static get properties() {
    return {
      data: { type: Object },
    };
  }

  constructor() {
    super();
    this.data = {};
  }

  render() {
    return html`
    <h1>${this.data.profile.name_surname}, ${this.data.profile.name_given}</h1>
    <dl>
      <dt>Born</dt>
      <dl>${this._getBirthday()}</dl>
      <dt>Born</dt>
      <dl>${this._getDeath()}</dl>
    </dl>
    `;
  }

  _getProfileEvent(type) {
    if (!('profile' in this.data)) {
      return null;
    }
    if (!('events' in this.data.profile)) {
      return null;
    }
    for (const event of this.data.profile.events) {
      if (event.type === type) {
        return event
      }
    }
    return null;
  }

  _getBirthday() {
    const Event = this._getProfileEvent("Birth");
    if (Event === null) {
      return 'unknown';
    }
    return html`${Event.date} in ${Event.place}`
  }

  _getDeath() {
    const Event = this._getProfileEvent("Death");
    if (Event === null) {
      return 'unknown';
    }
    return html`${Event.date} in ${Event.place}`
  }
}


window.customElements.define('grampsjs-person', GrampsjsPerson);
