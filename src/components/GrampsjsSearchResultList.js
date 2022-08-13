import { LitElement, css, html } from 'lit';
import '@material/mwc-icon';
import '@material/mwc-icon-button';
import '@material/mwc-list';
import '@material/mwc-list/mwc-list-item';

import {
  objectDescription,
  objectIcon,
  fireEvent,
  objectDetail,
} from '../util.js';
import { GrampsjsTranslateMixin } from '../mixins/GrampsjsTranslateMixin.js';

export class GrampsjsSearchResultList extends GrampsjsTranslateMixin(
  LitElement
) {
  static get styles() {
    return [
      css`
        mwc-list {
          --mdc-list-item-graphic-margin: 16px;
        }
      `,
    ];
  }

  static get properties() {
    return {
      data: { type: Array },
      textEmpty: { type: String },
      activatable: { type: Boolean },
      selectable: { type: Boolean },
    };
  }

  constructor() {
    super();
    this.data = [];
    this.textEmpty = '';
    this.activatable = false;
    this.selectable = false;
  }

  render() {
    return html`
      <mwc-list id="search-results" ?activatable="${this.activatable}">
        ${this.data.length === 0 && this.textEmpty
          ? html`
              <mwc-list-item noninteractive>
                <span>${this.textEmpty}</span>
              </mwc-list-item>
            `
          : ''}
        ${this.data.map((obj, i, arr) => {
          const desc = objectDescription(
            obj.object_type,
            obj.object,
            this.strings
          );
          const detail = objectDetail(
            obj.object_type,
            obj.object,
            this.strings
          );
          return html`
            <mwc-list-item
              ?noninteractive="${!this.selectable}"
              twoline
              graphic="icon"
              @click="${() => this._handleClick(obj)}"
            >
              <mwc-icon slot="graphic">${objectIcon[obj.object_type]}</mwc-icon>
              <span>${desc}</span>
              <span slot="secondary"
                >${obj.object.gramps_id}${detail.trim().length !== 0
                  ? html` | ${detail}`
                  : ''}</span
              >
            </mwc-list-item>
            ${arr.length - 1 !== i
              ? html`<li divider inset padded role="separator"></li>`
              : ''}
          `;
        }, this)}
      </mwc-list>
    `;
  }

  _handleClick(obj) {
    fireEvent(this, 'search-result:clicked', obj);
  }
}

window.customElements.define(
  'grampsjs-search-result-list',
  GrampsjsSearchResultList
);
