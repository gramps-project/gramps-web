/*
Form for adding a new tag or selecting an existing one
*/

import {html, css} from 'lit'

import '@awesome.me/webawesome/dist/components/color-picker/color-picker.js'
import '@material/web/divider/divider.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'
import './GrampsjsSearchResultList.js'
import './GrampsjsFormString.js'

import {makeHandle} from '../util.js'

class GrampsjsFormNewTag extends GrampsjsObjectForm {
  static get styles() {
    return [
      super.styles,
      css`
        .new-tag-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .new-tag-row grampsjs-form-string {
          flex: 1;
        }

        .section-label {
          color: var(--grampsjs-body-font-color-70);
          margin: 14px 0 6px;
        }

        md-divider {
          margin: 8px 0;
        }

        .skeleton-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 8px 16px;
        }

        .skeleton-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .skeleton-text {
          height: 14px;
          flex: 1;
          border-radius: 3px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      searchRes: {type: Array},
      disableString: {type: Boolean},
      disableField: {type: Boolean},
      _selectedTag: {type: String},
      _tagName: {type: String},
      _tagColor: {type: String},
      _loading: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.searchRes = []
    this.disableString = false
    this._selectedTag = ''
    this._tagName = ''
    this._tagColor = '#1f77b4'
    this._loading = true
    // Non-reactive guard flag; not in properties to avoid triggering re-renders
    this._saving = false
  }

  renderForm() {
    return html`
      <div class="new-tag-row">
        <grampsjs-form-string
          @formdata:changed="${this._handleString}"
          ?disabled="${this.disableString}"
          fullwidth
          id="create"
          label="${this._('New Tag')}"
        ></grampsjs-form-string>
        <wa-color-picker
          id="color"
          format="hex"
          value="${this._tagColor}"
          swatches="#1f77b4;#ff7f0e;#2ca02c;#d62728;#9467bd;#8c564b;#e377c2;#7f7f7f;#bcbd22;#17becf"
          @change="${this._handleColor}"
        ></wa-color-picker>
      </div>
      <md-divider></md-divider>
      <div class="section-label">${this._('Or select an existing tag')}</div>
      ${this._loading
        ? this._renderSkeleton()
        : html`
            <grampsjs-search-result-list
              selectable
              activatable
              .data="${this.searchRes}"
              .appState="${this.appState}"
              @search-result:clicked="${this._handleSelected}"
            ></grampsjs-search-result-list>
          `}
    `
  }

  // eslint-disable-next-line class-methods-use-this
  _renderSkeleton() {
    return html`
      ${[0.6, 0.85, 0.7].map(
        w => html`
          <div class="skeleton-item">
            <div class="skeleton skeleton-avatar"></div>
            <div
              class="skeleton skeleton-text"
              style="max-width: ${w * 100}%"
            ></div>
          </div>
        `
      )}
    `
  }

  firstUpdated() {
    // md-dialog.open is set asynchronously; re-render after a microtask so
    // dialogIsOpen is true and renderForm() runs before the fetch completes.
    Promise.resolve().then(() => this.requestUpdate())
    this._fetchData()
  }

  async _fetchData() {
    const url = `/api/tags/?locale=${
      this.appState.i18n.lang || 'en'
    }&profile=all&pagesize=100`
    const data = await this.appState.apiGet(url)
    if ('data' in data) {
      this.searchRes =
        data.data
          ?.map(tag => ({
            object_type: 'tag',
            object: tag,
            handle: tag.handle,
          }))
          ?.filter(obj => !this.data.includes(obj.handle)) ?? []
    } else if ('error' in data) {
      this.searchRes = []
    }
    this._loading = false
  }

  _handleString(e) {
    this._tagName = e.detail.data
  }

  _handleColor(e) {
    this._tagColor = e.target.value
  }

  async _handleDialogSave() {
    if (this._saving) return
    this._saving = true
    try {
      if (!this.disableString && this._tagName) {
        const handle = await this._createNewTag()
        this.data = [...this.data, handle]
      } else if (this._selectedTag && !this.data.includes(this._selectedTag)) {
        this.data = [...this.data, this._selectedTag]
      }
      super._handleDialogSave()
    } finally {
      this._saving = false
    }
  }

  async _createNewTag() {
    const obj = {
      _class: 'Tag',
      handle: makeHandle(),
      name: this._tagName,
    }
    if (this._tagColor) {
      obj.color = this._tagColor
    }
    await this.appState.apiPost('/api/tags/', obj)
    return obj.handle
  }

  _handleSelected(e) {
    this.disableString = true
    const obj = e.detail
    this._selectedTag = obj.handle
  }
}

window.customElements.define('grampsjs-form-new-tag', GrampsjsFormNewTag)
