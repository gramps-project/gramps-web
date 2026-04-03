import {html} from 'lit'
import '../components/GrampsjsTags.js'
import '../components/GrampsjsFormNewTag.js'

export const GrampsjsNewObjectTagsMixin = superClass =>
  class extends superClass {
    static get properties() {
      return {
        _allTags: {type: Array},
        _tagDialogContent: {type: Object},
      }
    }

    constructor() {
      super()
      this._allTags = []
      this._tagDialogContent = ''
    }

    _renderTagsForm() {
      const selectedTags = this._allTags.filter(t =>
        (this.data.tag_list || []).includes(t.handle)
      )
      return html`
        <h4 class="label">${this._('Tags')}</h4>
        <grampsjs-tags
          .data="${selectedTags}"
          edit
          noHeading
          .appState="${this.appState}"
          @tag:new="${this._handleNewTag}"
          @edit:action="${this._handleTagAction}"
        ></grampsjs-tags>
        ${this._tagDialogContent}
      `
    }

    _handleNewTag() {
      this._tagDialogContent = html`
        <grampsjs-form-new-tag
          .appState="${this.appState}"
          .data="${this.data.tag_list || []}"
          dialogTitle="${this._('Add Tag')}"
          @object:save="${this._handleSaveTag}"
          @object:cancel="${() => {
            this._tagDialogContent = ''
          }}"
        ></grampsjs-form-new-tag>
      `
    }

    async _handleSaveTag(e) {
      this.data = {...this.data, tag_list: e.detail.data}
      this._tagDialogContent = ''
      await this._fetchAllTags()
    }

    _handleTagAction(e) {
      if (e.detail?.action === 'updateProp' && 'tag_list' in e.detail.data) {
        this.data = {...this.data, tag_list: e.detail.data.tag_list}
      }
    }

    async _fetchAllTags() {
      const lang = this.appState?.i18n?.lang || 'en'
      const data = await this.appState.apiGet(
        `/api/tags/?locale=${lang}&pagesize=500`
      )
      if ('data' in data) {
        this._allTags = data.data
      }
    }

    _reset() {
      super._reset()
      this._tagDialogContent = ''
    }
  }
