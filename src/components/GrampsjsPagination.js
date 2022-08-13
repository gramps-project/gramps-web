import { html, css, LitElement } from 'lit';

import '@material/mwc-icon';
import '@material/mwc-button';

import { sharedStyles } from '../SharedStyles.js';
import { GrampsjsTranslateMixin } from '../mixins/GrampsjsTranslateMixin.js';

class GrampsjsPagination extends GrampsjsTranslateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .paging {
          font-size: 14px;
          font-size: 14px;
          margin-top: 50px;
          text-align: center;
        }

        .span {
          color: rgba(0, 0, 0, 0.9);
          padding: 0 0.5em;
        }

        mwc-button {
          --mdc-ripple-focus-opacity: 0;
          --mdc-theme-primary: rgba(0, 0, 0, 0.7);
        }

        .pagebtn {
          --mdc-button-horizontal-padding: 0;
        }

        mwc-icon.more {
          color: rgba(0, 0, 0, 0.2);
          position: relative;
          top: 0.35em;
        }
      `,
    ];
  }

  static get properties() {
    return {
      page: { type: Number },
      pages: { type: Number },
      link: { type: String },
    };
  }

  constructor() {
    super();
    this.page = 1;
    this.pages = -1;
  }

  render() {
    if (this.pages === -1) {
      return html``;
    }
    return html`
      <div class="paging">
        ${this._renderPrevBtn()} ${this._renderPageBtn(1)}
        ${this.pages > 1 ? this._renderPageBtn(2) : ''}
        ${this.page - 1 > 3
          ? html`<mwc-icon class="more">more_horiz</mwc-icon>`
          : ''}
        ${this.page - 1 > 2 && this.page - 1 < this.pages - 1
          ? this._renderPageBtn(this.page - 1)
          : ''}
        ${this.page > 2 && this.page < this.pages - 1
          ? this._renderPageBtn(this.page)
          : ''}
        ${this.page + 1 > 2 && this.page + 1 < this.pages - 1
          ? this._renderPageBtn(this.page + 1)
          : ''}
        ${this.page + 1 < this.pages - 2
          ? html`<mwc-icon class="more">more_horiz</mwc-icon>`
          : ''}
        ${this.pages > 3 ? this._renderPageBtn(this.pages - 1) : ''}
        ${this.pages > 2 ? this._renderPageBtn(this.pages) : ''}
        ${this._renderNextBtn()}
        <div></div>
      </div>
    `;
  }

  _renderPageBtn(page) {
    return html`
      <mwc-button
        width="30px"
        class="pagebtn"
        ?disabled=${this.page === page}
        ?unelevated=${this.page === page}
        @click="${() => this._changePage(page)}"
        label="${page}"
      >
      </mwc-button>
    `;
  }

  _renderPrevBtn() {
    return html`
      <mwc-button
        icon="navigate_before"
        ?disabled=${this.page === 1}
        @click="${() => this._changePage(this.page - 1)}"
        label="${this._('Previous')}"
      >
      </mwc-button>
    `;
  }

  _renderNextBtn() {
    return html`
      <mwc-button
        icon="navigate_next"
        ?disabled=${this.page === this.pages}
        @click="${() => this._changePage(this.page + 1)}"
        label="${this._('Next')}"
        trailingIcon
      >
      </mwc-button>
    `;
  }

  _changePage(page) {
    if (page !== this.page) {
      this.page = page;
      this._fireEvent();
    }
  }

  _fireEvent() {
    this.dispatchEvent(
      new CustomEvent('page:changed', {
        bubbles: true,
        composed: true,
        detail: { page: this.page },
      })
    );
  }
}

window.customElements.define('grampsjs-pagination', GrampsjsPagination);
