import {html, css, LitElement} from 'lit'

import '@material/web/iconbutton/icon-button.js'

import {
  mdiChevronLeft,
  mdiChevronRight,
  mdiPageFirst,
  mdiPageLast,
} from '@mdi/js'

import './GrampsjsIcon.js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent} from '../util.js'

class GrampsjsPagination extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .paging {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          margin-top: 24px;
          /* Room to scroll the buttons clear of a list's floating add button,
             which sits 32px from the bottom and is 56px high */
          margin-bottom: 88px;
          font-size: 14px;
          font-weight: 400;
          color: var(--grampsjs-body-font-color-60);
        }

        .range {
          margin-right: 12px;
          font-variant-numeric: tabular-nums;
        }

        md-icon-button {
          --md-icon-button-icon-color: var(--grampsjs-body-font-color-70);
          --md-icon-button-disabled-icon-color: var(
            --grampsjs-body-font-color-20
          );
          --md-icon-button-disabled-icon-opacity: 1;
        }
      `,
    ]
  }

  static get properties() {
    return {
      page: {type: Number},
      pages: {type: Number},
      total: {type: Number},
      pageSize: {type: Number},
    }
  }

  constructor() {
    super()
    this.page = 1
    this.pages = -1
    this.total = -1
    this.pageSize = -1
  }

  render() {
    if (this.pages <= 0) {
      return html``
    }
    return html`
      <div class="paging">
        <span class="range">${this._renderRange()}</span>
        ${this._renderButton(mdiPageFirst, '_First', 1, this.page === 1)}
        ${this._renderButton(
          mdiChevronLeft,
          'Previous',
          this.page - 1,
          this.page === 1
        )}
        ${this._renderButton(
          mdiChevronRight,
          'Next',
          this.page + 1,
          this.page === this.pages
        )}
        ${this._renderButton(
          mdiPageLast,
          '_Last',
          this.pages,
          this.page === this.pages
        )}
      </div>
    `
  }

  // "1–24 of 3,214" when the total and page size are known, else "3 of 12"
  // pages.
  _renderRange() {
    const format = new Intl.NumberFormat(
      (this.appState?.i18n?.lang || 'en').replace('_', '-')
    ).format
    let current = format(this.page)
    let total = format(this.pages)
    if (this.total > 0 && this.pageSize > 0) {
      const first = (this.page - 1) * this.pageSize + 1
      const last = Math.min(this.page * this.pageSize, this.total)
      current = `${format(first)}–${format(last)}`
      total = format(this.total)
    }
    return this._('%(current)d of %(total)d')
      .replace('%(current)d', current)
      .replace('%(total)d', total)
  }

  _renderButton(path, label, page, disabled) {
    return html`
      <md-icon-button
        aria-label="${this._(label)}"
        title="${this._(label)}"
        ?disabled=${disabled}
        @click="${() => this._changePage(page)}"
      >
        <grampsjs-icon path="${path}" color="currentColor"></grampsjs-icon>
      </md-icon-button>
    `
  }

  _changePage(page) {
    if (page !== this.page) {
      this.page = page
      fireEvent(this, 'page:changed', {page: this.page})
    }
  }
}

window.customElements.define('grampsjs-pagination', GrampsjsPagination)
