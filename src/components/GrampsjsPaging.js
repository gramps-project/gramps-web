
import {html, css, LitElement} from 'lit-element'

import '@material/mwc-icon-button'

import {sharedStyles} from '../SharedStyles.js'


class GrampsjsPaging extends LitElement {

  static get styles() {
    return [
      sharedStyles,
      css`

      .paging {
        font-size: 14px;
        font-size: 14px;
        line-height: 48px;
        margin-top: 30px;
        text-align: center;
      }

      .span {
        color: rgba(0, 0, 0, 0.9);
        padding: 0 0.5em;
      }

      mwc-icon-button {
        --mdc-ripple-focus-opacity: 0;
      }
      `
    ]
  }

  static get properties() { return {
    page: {type: Number},
    pages: {type: Number},
    link: {type: String}
  }}

  constructor() {
    super()
    this.page = 1
    this.pages = -1
  }

  render() {
    if (this.pages === -1) {
      return html``
    }
    return html`
    <div class="paging">
      <mwc-icon-button icon="first_page" ?disabled=${this.page === 1} @click="${this._pageFirst}"></mwc-icon-button>
      <mwc-icon-button icon="navigate_before" ?disabled=${this.page === 1} @click="${this._pagePrev}"></mwc-icon-button>
      <span>Page ${this.page} / ${this.pages}</span>
      <mwc-icon-button icon="navigate_next" ?disabled=${this.page === this.pages} @click="${this._pageNext}"></mwc-icon-button>
      <mwc-icon-button icon="last_page" ?disabled=${this.page === this.pages} @click="${this._pageLast}"></mwc-icon-button>
    <div>
      `
  }

  _pageFirst() {
    this._changePage(1)
  }

  _pagePrev() {
    if (this.page > 1) {
      this._changePage(this.page - 1)
    }
  }

  _pageNext() {
    if (this.page < this.pages) {
      this._changePage(this.page + 1)
    }
  }

  _pageLast() {
    this._changePage(this.pages)
  }

  _changePage(page) {
    if (page !== this.page) {
      this.page = page
      this._fireEvent()
    }
  }

  _fireEvent() {
    this.dispatchEvent(new CustomEvent('page:changed', {bubbles: true, composed: true, detail: {page: this.page}}))
  }


}

window.customElements.define('grampsjs-paging', GrampsjsPaging)
