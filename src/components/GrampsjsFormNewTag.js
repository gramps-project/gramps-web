/*
Form for adding a new tag or selecting an existing one
*/

import {html, css} from 'lit'

import '@awesome.me/webawesome/dist/components/color-picker/color-picker.js'
import '@material/web/divider/divider.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'
import './GrampsjsSearchResultList.js'
import './GrampsjsFormString.js'

import {fireEvent, makeHandle} from '../util.js'
import {fetchAllTags} from '../tags.js'

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

        @media (max-width: 600px) {
          wa-color-picker {
            --grid-width: min(200px, 60vw);
            --grid-height: min(140px, 42vw);
          }
        }
      `,
    ]
  }

  static get properties() {
    return {
      searchRes: {type: Array},
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
    const data = await fetchAllTags(this.appState)
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

  get isValid() {
    return Boolean(this._tagName.trim() || this._selectedTag)
  }

  // Typing a name and selecting an existing tag exclude each other; the
  // last of the two wins.
  _handleString(e) {
    this._tagName = e.detail.data ?? ''
    if (this._tagName.trim() && this._selectedTag) {
      this._selectedTag = ''
      this.renderRoot
        .querySelector('grampsjs-search-result-list')
        ?.clearSelection()
    }
  }

  _handleColor(e) {
    this._tagColor = e.target.value
  }

  async _handleDialogSave() {
    if (this._saving || !this.isValid) return
    this._saving = true
    try {
      const handle = this._tagName.trim()
        ? await this._getOrCreateTag(this._tagName.trim())
        : this._selectedTag
      if (!handle) {
        // creating the tag failed; keep the dialog open
        return
      }
      if (!this.data.includes(handle)) {
        this.data = [...this.data, handle]
      }
      super._handleDialogSave()
    } finally {
      this._saving = false
    }
  }

  /* Return the handle of the tag with this name, creating it if no tag has
  the name yet. Returns null if looking up or creating it fails. */
  async _getOrCreateTag(name) {
    const tags = await fetchAllTags(this.appState)
    if ('error' in tags) {
      fireEvent(this, 'grampsjs:error', {message: tags.error})
      return null
    }
    const existing = (tags.data ?? []).find(
      tag => tag.name?.trim().toLowerCase() === name.toLowerCase()
    )
    if (existing) {
      return existing.handle
    }
    const obj = {
      _class: 'Tag',
      handle: makeHandle(),
      name,
    }
    if (this._tagColor) {
      obj.color = this._tagColor
    }
    const res = await this.appState.apiPost('/api/tags/', obj)
    if ('error' in res) {
      fireEvent(this, 'grampsjs:error', {message: res.error})
      return null
    }
    return obj.handle
  }

  _handleSelected(e) {
    this._selectedTag = e.detail.handle
    if (this._tagName) {
      this._tagName = ''
      this.renderRoot.querySelector('grampsjs-form-string')?.reset()
    }
  }
}

window.customElements.define('grampsjs-form-new-tag', GrampsjsFormNewTag)
