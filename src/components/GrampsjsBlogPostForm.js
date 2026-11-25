import {html, css, LitElement} from 'lit'
import {keyed} from 'lit/directives/keyed.js'

import '@material/web/button/text-button.js'
import '@material/web/textfield/filled-text-field.js'

import './GrampsjsEditor.js'
import './GrampsjsFormString.js'
import './GrampsjsFormPrivate.js'
import './GrampsjsGallery.js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {GrampsjsNewObjectTagsMixin} from '../mixins/GrampsjsNewObjectTagsMixin.js'
import {clearDraftsWithPrefix} from '../api.js'
import {
  fireEvent,
  moveTo,
  reportRequiredField,
  toWritableObject,
} from '../util.js'
import {
  blogPostIsoDate,
  blogPostNote,
  isIsoDate,
  localIsoDate,
} from '../blog.js'

export const EMPTY_TEXT = {_class: 'StyledText', string: '', tags: []}

// the Blog tag makes a source a blog post, and saving always keeps it
const BLOG_HIDDEN_TAGS = ['Blog']

// The values of the form for a post, or for a new post without one
function initialData(source) {
  if (!source) {
    return {
      title: '',
      author: '',
      date: localIsoDate(),
      text: EMPTY_TEXT,
      media_list: [],
      media_updates: [],
      tag_list: [],
      private: false,
    }
  }
  return {
    title: source.title ?? '',
    author: source.author ?? '',
    date: blogPostIsoDate(source) || localIsoDate(),
    text: blogPostNote(source)?.text ?? EMPTY_TEXT,
    media_list: source.media_list ?? [],
    media_updates: [],
    tag_list: source.tag_list ?? [],
    private: Boolean(source.private),
  }
}

// The form of a blog post, used to add a post and to edit one. Its `data`
// are the values entered, {title, author, date, text, media_list,
// media_updates, tag_list, private}, where media_updates are the media
// objects of the post with a changed privacy; it fires
// `blog-post-form:changed` when they change. The form starts with the values
// of `source`, a post with its extended notes and media, or empty without
// one. The text is saved by the page holding the form, which saves the other
// values too.
export class GrampsjsBlogPostForm extends GrampsjsNewObjectTagsMixin(
  GrampsjsAppStateMixin(LitElement)
) {
  static get styles() {
    return [
      sharedStyles,
      css`
        div.spacer {
          margin-top: 2em;
        }

        h3 {
          font-size: 1.35em;
        }

        #source-name {
          width: 100%;
        }
      `,
    ]
  }

  static get properties() {
    return {
      source: {type: Object},
      data: {type: Object},
      // the media objects of the post by handle, as saved
      _media: {type: Object},
    }
  }

  constructor() {
    super()
    this.source = null
    this.data = initialData(null)
    this._media = {}
    // changes when the form starts afresh, so the fields are created anew
    this._formKey = 0
    this._boundHandleFormData = this._handleFormData.bind(this)
  }

  get valid() {
    return Boolean(this.data.title.trim()) && isIsoDate(this.data.date)
  }

  willUpdate(changed) {
    if (changed.has('source')) {
      this._start()
    }
  }

  firstUpdated() {
    this._fetchAllTags()
  }

  // The fields keep what is entered, so the values bound to them only matter
  // when they are created
  render() {
    return keyed(this._formKey, this._renderFields())
  }

  _renderFields() {
    return html`
      <h3 class="label">${this._('Title')}</h3>
      <p>
        <md-filled-text-field
          required
          supporting-text="&nbsp;"
          .value="${this.data.title}"
          @input="${this._handleTitle}"
          @blur="${this._handleTitle}"
          id="source-name"
        ></md-filled-text-field>
      </p>

      <h3 class="label">${this._('Author')}</h3>
      <p>
        <grampsjs-form-string
          fullwidth
          id="author"
          value="${this.data.author}"
        ></grampsjs-form-string>
      </p>

      <h3 class="label">${this._('Date')}</h3>
      <p>
        <md-filled-text-field
          required
          type="date"
          .value="${this.data.date}"
          @input="${this._handleDate}"
          @change="${this._handleDate}"
          id="blog-post-date"
        ></md-filled-text-field>
      </p>

      <h3 class="label">${this._('Content')}</h3>
      <p>
        <grampsjs-editor
          @formdata:changed="${this._handleEditor}"
          id="blog-post-content-editor"
          allowImages
          savedByForm
          .initialData="${this.data.text}"
          .appState="${this.appState}"
        ></grampsjs-editor>
      </p>

      <h3 class="label">${this._('Media')}</h3>
      <grampsjs-gallery
        edit
        firstTileLabel="${this._('Cover image')}"
        .media="${this._galleryMedia()}"
        .mediaRef="${this.data.media_list}"
        .appState="${this.appState}"
        @edit:action="${this._handleGalleryAction}"
      ></grampsjs-gallery>

      ${this._renderTagsForm(BLOG_HIDDEN_TAGS)}

      <div class="spacer"></div>
      <grampsjs-form-private
        id="private"
        ?checked="${this.data.private}"
        .appState="${this.appState}"
      ></grampsjs-form-private>
      ${this.source?.gramps_id ? this._renderSourceLink() : ''}
    `
  }

  // the record of the post, for what the form doesn't edit
  _renderSourceLink() {
    const grampsId = this.source.gramps_id
    return html`
      <div class="spacer"></div>
      <md-text-button id="source-link" href="/source/${grampsId}"
        >${this._('Source')} ${grampsId}</md-text-button
      >
    `
  }

  // The media objects of the gallery, aligned with the media references. A
  // media object not loaded yet, or missing, has only its handle.
  _galleryMedia() {
    return this.data.media_list.map(ref => {
      const update = this.data.media_updates.find(m => m.handle === ref.ref)
      return update ?? this._media[ref.ref] ?? {handle: ref.ref}
    })
  }

  // Starts afresh with the values of the source
  _start() {
    this.data = initialData(this.source)
    this._media = Object.fromEntries(
      (this.source?.extended?.media ?? [])
        .filter(Boolean)
        .map(obj => [obj.handle, obj])
    )
    this._formKey += 1
    this._tagDialogContent = ''
  }

  // Starts afresh and discards the draft of the text
  reset() {
    clearDraftsWithPrefix(this._draftPrefix)
    this._start()
    this._changed()
  }

  get _draftPrefix() {
    const {page, pageId} = this.appState?.path ?? {page: '', pageId: ''}
    return `${page}:${pageId}:`
  }

  _set(values) {
    this.data = {...this.data, ...values}
    this._changed()
  }

  _changed() {
    fireEvent(this, 'blog-post-form:changed', {data: this.data})
  }

  _handleTitle(e) {
    reportRequiredField(e.target, this._('This field is mandatory'))
    this._set({title: e.target.value})
  }

  _handleDate(e) {
    this._set({date: e.target.value})
  }

  _handleEditor(e) {
    e.stopPropagation()
    this._set({text: e.detail?.data ?? EMPTY_TEXT})
  }

  // the form handles the data of its fields, which the page doesn't see
  _handleFormData(e) {
    const {id} = e.composedPath()[0]
    if (id === 'author') {
      this._set({author: e.detail.data})
    } else if (id === 'private') {
      this._set({private: e.detail.checked})
    } else {
      return
    }
    e.stopPropagation()
  }

  // The gallery's changes are kept until the post is saved
  _handleGalleryAction(e) {
    e.stopPropagation()
    const {action, index, to, data, media} = e.detail
    const list = this.data.media_list
    if (action === 'addMediaRef') {
      this._set({media_list: [...list, data]})
      this._fetchMedia(data.ref)
    } else if (action === 'delMediaRef') {
      this._set({media_list: list.filter((_, i) => i !== index)})
    } else if (action === 'moveListItem') {
      this._set({media_list: moveTo(list, index, to)})
    } else if (action === 'updateLinkedMedia') {
      this._setMediaPrivacy(media.handle, Boolean(data.private))
    }
  }

  async _fetchMedia(handle) {
    if (this._media[handle]) {
      return
    }
    const res = await this.appState.apiGet(`/api/media/${handle}`)
    if ('data' in res) {
      this._media = {...this._media, [handle]: res.data}
    }
  }

  // A media object whose privacy is changed back is no longer updated
  _setMediaPrivacy(handle, isPrivate) {
    const saved = this._media[handle]
    if (!saved) {
      return
    }
    const updates = this.data.media_updates.filter(m => m.handle !== handle)
    this._set({
      media_updates:
        Boolean(saved.private) === isPrivate
          ? updates
          : [...updates, {...toWritableObject(saved), private: isPrivate}],
    })
  }

  async _handleSaveTag(e) {
    await super._handleSaveTag(e)
    this._changed()
  }

  _handleTagAction(e) {
    e.stopPropagation()
    super._handleTagAction(e)
    this._changed()
  }

  connectedCallback() {
    super.connectedCallback()
    this.addEventListener('formdata:changed', this._boundHandleFormData)
  }

  disconnectedCallback() {
    this.removeEventListener('formdata:changed', this._boundHandleFormData)
    super.disconnectedCallback()
  }
}

window.customElements.define('grampsjs-blog-post-form', GrampsjsBlogPostForm)
