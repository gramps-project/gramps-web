import {html, css, LitElement} from 'lit'
import {live} from 'lit/directives/live.js'

import '@material/mwc-dialog'
import '@material/mwc-textfield'
import '@material/mwc-icon'
import '@material/mwc-button'
import '@material/mwc-icon-button'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/button/text-button.js'
import {mdiInformation, mdiClose} from '@mdi/js'

import {sharedStyles} from '../SharedStyles.js'
import {fireEvent, stripHtml} from '../util.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {saveDraft, getDraft, clearDraft, clearDraftsWithPrefix} from '../api.js'
import './GrampsjsFormSelectObject.js'
import './GrampsjsTimedelta.js'
import './GrampsjsIcon.js'

function capitalize(string) {
  return `${string.charAt(0).toUpperCase()}${string.slice(1)}`
}

function _applyTag(str, tag) {
  const [name, value] = tag
  if (name === 'bold') {
    return `<b>${str}</b>`
  }
  if (name === 'italic') {
    return `<i>${str}</i>`
  }
  if (name === 'underline') {
    return `<u>${str}</u>`
  }
  if (name === 'fontface') {
    return `<span style="font-family:${value}">${str}</span>`
  }
  if (name === 'fontsize') {
    return `<span style="font-size:${value}px;">${str}</span>`
  }
  if (name === 'fontcolor') {
    return `<span style="color:${value}">${str}</span>`
  }
  if (name === 'highlight') {
    return `<span style="background-color:${value}">${str}</span>`
  }
  if (name === 'superscript') {
    return `<sup>${str}</sup>`
  }
  if (name === 'link') {
    return `<a href="${value}">${str}</a>`
  }
  return `[${name} ${value}]${str}[/${name}]`
}

// check if tag name is a boolean tag
function isBooleanTag(tagName) {
  const namesBool = ['bold', 'italic', 'underline', 'superscript']
  if (namesBool.includes(tagName)) {
    return true
  }
  return false
}

function _applyTags(str, tags) {
  let tstr = `${str}`
  tags.forEach(tag => {
    tstr = _applyTag(tstr, tag)
  })
  return tstr
}

// get the number of text characters before a node in a parent
function getNumCharBeforeNode(node, parent) {
  let n = 0
  let found = false
  parent.childNodes.forEach(childNode => {
    if (childNode === node) {
      found = true
    }
    if (!found) {
      if (childNode.hasChildNodes()) {
        const [nChild, foundChild] = getNumCharBeforeNode(node, childNode)
        n += nChild
        found = foundChild
      } else if (childNode.nodeType !== Node.COMMENT_NODE) {
        n += childNode.textContent.length
      }
    }
  })
  return [n, found]
}

// get the node at the number of characters in a parent
function getNodeAtNumChar(parent, num) {
  let n = 0
  let found = false
  let node = null
  parent.childNodes.forEach(childNode => {
    if (!found) {
      if (childNode.nodeType !== Node.COMMENT_NODE) {
        n += childNode.textContent.length
        if (n >= num) {
          found = true
          node = childNode
        }
      }
    }
  })
  if (node !== null && node.hasChildNodes()) {
    return getNodeAtNumChar(node, num - (n - node.textContent.length))
  }
  return node
}

class GrampsjsEditor extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .note {
          font-family: var(
            --grampsjs-note-font-family,
            var(--grampsjs-body-font-family)
          );
          font-size: var(--grampsjs-note-font-size, 17px);
          line-height: var(--grampsjs-note-line-height, 1.5em);
          color: var(--grampsjs-note-color);
          white-space: pre-wrap;
        }

        .framed {
          border: 1px solid var(--mdc-theme-secondary);
          border-radius: 8px;
          padding: 20px 25px;
        }

        mwc-icon-button {
          color: var(--grampsjs-body-font-color-50);
        }

        #controls {
          margin: 0.7em 0;
        }

        a {
          pointer-events: none;
        }

        .draft-banner {
          background-color: var(--grampsjs-color-shade-230);
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 1em;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
          color: var(--grampsjs-body-font-color-60);
        }

        .draft-banner-content {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .draft-banner-content grampsjs-icon {
          --grampsjs-icon-size: 18px;
          color: var(--grampsjs-body-font-color-50);
        }

        .draft-banner-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .draft-banner md-text-button {
          --md-text-button-label-text-size: 13px;
          --md-text-button-label-text-color: var(--mdc-theme-primary);
          --md-text-button-hover-label-text-color: var(--mdc-theme-primary);
          --md-text-button-pressed-label-text-color: var(--mdc-theme-primary);
        }

        .draft-banner md-icon-button {
          --md-icon-button-icon-size: 18px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      initialData: {type: Object},
      data: {type: Object},
      cursorPosition: {type: Array},
      _dialogContent: {type: String},
      _html: {type: String},
      _showDraftBanner: {type: Boolean},
      _draftTimestamp: {type: Number},
    }
  }

  constructor() {
    super()
    this.initialData = {_class: 'StyledText', string: '', tags: []}
    this.data = {_class: 'StyledText', string: '', tags: []}
    this.cursorPosition = [0]
    this._dialogContent = ''
    this._html = ''
    this._showDraftBanner = false
    this._draftTimestamp = 0
    // Debounce timer for draft saving
    this._draftSaveTimer = null
    // Bind methods that need to be added/removed as event listeners
    this._boundHandleSaveButton = this._handleSaveButton.bind(this)
    this._boundHandleBeforeUnload = this._handleBeforeUnload.bind(this)
    this._boundHandleCancel = this._handleCancel.bind(this)
    this._boundHandleSaved = this._handleSaved.bind(this)
  }

  _getStorageKey() {
    // Create unique key from page routing + element ID
    const {page, pageId} = this.appState?.path || {page: '', pageId: ''}
    const elementId = this.id || ''
    return `${page}:${pageId}:${elementId}`
  }

  _getStorageKeyPrefix() {
    // Get prefix for clearing all drafts for this page/context
    const {page, pageId} = this.appState?.path || {page: '', pageId: ''}
    return `${page}:${pageId}:`
  }

  reset() {
    this.data = this.initialData
    this.cursorPosition = [0]
  }

  render() {
    return html`
      ${this._showDraftBanner
        ? html`
            <div class="draft-banner">
              <div class="draft-banner-content">
                <grampsjs-icon
                  path="${mdiInformation}"
                  color="var(--grampsjs-body-font-color-50)"
                ></grampsjs-icon>
                <span>
                  ${this._('Unsaved changes restored')} (<grampsjs-timedelta
                    timestamp="${Math.floor(this._draftTimestamp / 1000)}"
                    locale="${this.appState?.i18n?.lang || 'en'}"
                  ></grampsjs-timedelta
                  >)
                </span>
              </div>
              <div class="draft-banner-actions">
                <md-text-button
                  @click="${this._handleDiscardDraft}"
                  style="--md-sys-color-primary: var(--mdc-theme-primary);"
                >
                  ${this._('Discard')}
                </md-text-button>
                <md-icon-button @click="${this._handleDismissBanner}">
                  <grampsjs-icon path="${mdiClose}"></grampsjs-icon>
                </md-icon-button>
              </div>
            </div>
          `
        : ''}
      <div id="controls">
        <mwc-icon-button
          id="btn-bold"
          icon="format_bold"
          @click="${() => this._handleFormat('bold')}"
        ></mwc-icon-button>
        <grampsjs-tooltip for="btn-bold" .appState="${this.appState}"
          >${this._('Bold')}</grampsjs-tooltip
        >
        <mwc-icon-button
          id="btn-italic"
          icon="format_italic"
          @click="${() => this._handleFormat('italic')}"
        ></mwc-icon-button>
        <grampsjs-tooltip for="btn-italic" .appState="${this.appState}"
          >${this._('Italic')}</grampsjs-tooltip
        >
        <mwc-icon-button
          id="btn-underline"
          icon="format_underlined"
          @click="${() => this._handleFormat('underline')}"
        ></mwc-icon-button>
        <grampsjs-tooltip for="btn-underline" .appState="${this.appState}"
          >${this._('Underline')}</grampsjs-tooltip
        >
        <mwc-icon-button
          id="btn-link"
          icon="link"
          @click="${() => this._handleFormat('link')}"
        ></mwc-icon-button>
        <grampsjs-tooltip for="btn-link" .appState="${this.appState}"
          >${this._('Link')}</grampsjs-tooltip
        >
      </div>
      <!-- display: inline -->
      <div
        id="editor-content"
        class="note framed"
        contenteditable="true"
        @beforeinput="${this._handleBeforeInput}"
        @compositionend="${this._handleCompositionEnd}"
        @keydown="${this._handleKeydown}"
        .innerHTML="${live(this._html)}"
      ></div>
      ${this._renderLinkDialog()}
    `
  }

  firstUpdated() {
    this._restoreDraft()
  }

  _restoreDraft() {
    const draft = getDraft(this._getStorageKey())
    if (!draft || !draft.data) {
      // No draft found, use normal initialization
      this.reset()
      return
    }

    // Only restore if draft is actually different from initial data
    const draftString = JSON.stringify(draft.data)
    const initialString = JSON.stringify(this.initialData)

    if (draftString === initialString) {
      clearDraft(this._getStorageKey())
      return
    }

    this.data = draft.data

    // Show banner only if initialData is non-empty (not for new notes)
    if (this.initialData.string && this.initialData.string.trim() !== '') {
      this._showDraftBanner = true
      this._draftTimestamp = draft.timestamp
    }

    // Notify parent component of the restored data
    fireEvent(this, 'formdata:changed', {data: this.data})

    // Clear the draft after restoration
    clearDraft(this._getStorageKey())
  }

  get _editorDiv() {
    return this.renderRoot.getElementById('editor-content')
  }

  _handleKeydown(e) {
    if (e.key === 'Escape') {
      this._editorDiv.blur()
      e.preventDefault()
      e.stopPropagation()
      return
    }
    if (e.ctrlKey || e.metaKey) {
      let handled = false
      switch (e.key.toLowerCase()) {
        case 'b':
          this._handleFormat('bold')
          handled = true
          break
        case 'i':
          this._handleFormat('italic')
          handled = true
          break
        case 'u':
          this._handleFormat('underline')
          handled = true
          break
        case 'k':
          this._handleFormat('link')
          handled = true
          break
        default:
          break
      }
      if (handled) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
  }

  _handleBeforeInput(e) {
    e.preventDefault()
    e.stopPropagation()
    if (
      [
        'insertText',
        'insertParagraph',
        'insertLineBreak',
        'deleteContentBackward',
        'deleteContentForward',
        'insertFromPaste',
        'deleteByCut',
        'formatBold',
        'formatItalic',
        'formatUnderline',
      ].includes(e.inputType)
    ) {
      const div = this.shadowRoot.querySelector('div.note')
      const [range] = e.getTargetRanges()
      const nCharBefore1 = getNumCharBeforeNode(range.startContainer, div)[0]
      if (e.inputType === 'insertText') {
        if (range.startOffset !== range.endOffset) {
          const nCharBefore2 = getNumCharBeforeNode(range.endContainer, div)[0]
          this._deleteText(
            nCharBefore1 + range.startOffset,
            nCharBefore2 + range.endOffset
          )
          this.cursorPosition = [nCharBefore1 + range.startOffset]
        }
        this._insertText(e.data, nCharBefore1 + range.startOffset)
        this.cursorPosition = [nCharBefore1 + range.startOffset + e.data.length]
      }
      if (e.inputType === 'insertFromPaste') {
        if (range.startOffset !== range.endOffset) {
          const nCharBefore2 = getNumCharBeforeNode(range.endContainer, div)[0]
          this._deleteText(
            nCharBefore1 + range.startOffset,
            nCharBefore2 + range.endOffset
          )
        }
        const data = stripHtml(e.dataTransfer.getData('text/plain'))
        this._insertText(data, nCharBefore1 + range.startOffset)
        this.cursorPosition = [nCharBefore1 + range.startOffset + data.length]
      } else if (e.inputType === 'insertParagraph') {
        this._insertText('\n\n', nCharBefore1 + range.startOffset)
        this.cursorPosition = [nCharBefore1 + range.startOffset + 2]
      } else if (e.inputType === 'insertLineBreak') {
        this._insertText('\n', nCharBefore1 + range.startOffset)
        this.cursorPosition = [nCharBefore1 + range.startOffset + 1]
      } else if (
        [
          'deleteContentBackward',
          'deleteContentForward',
          'deleteByCut',
        ].includes(e.inputType)
      ) {
        const nCharBefore2 = getNumCharBeforeNode(range.endContainer, div)[0]
        this._deleteText(
          nCharBefore1 + range.startOffset,
          nCharBefore2 + range.endOffset
        )
        this.cursorPosition = [nCharBefore1 + range.startOffset]
      } else if (e.inputType === 'formatBold') {
        this._handleFormat('bold')
      } else if (e.inputType === 'formatItalic') {
        this._handleFormat('italic')
      } else if (e.inputType === 'formatUnderline') {
        this._handleFormat('underline')
      }
    } else {
      // eslint-disable-next-line no-console
      console.log(e)
    }
    this.handleChange()
  }

  // also handle composition events
  _handleCompositionEnd(e) {
    e.preventDefault()
    e.stopPropagation()
    const range = this.shadowRoot.getSelection
      ? // Chrome
        this.shadowRoot.getSelection().getRangeAt(0)
      : // Firefox
        document.getSelection().getRangeAt(0)
    const nCharBefore1 = getNumCharBeforeNode(
      range.startContainer,
      this._editorDiv
    )[0]
    this._insertText(e.data, nCharBefore1 + range.startOffset)
    this.cursorPosition = [nCharBefore1 + range.startOffset]
  }

  _handleLink(pos) {
    this._dialogContent = html`
      <p>
        <mwc-textfield
          id="linkurl"
          label="URL"
          style="width:100%"
        ></mwc-textfield>
      </p>
      <p>
        <grampsjs-form-select-object
          fixedMenuPosition
          @select-object:changed="${this._handleSelectObjectsChanged}"
          .appState="${this.appState}"
          id="link-select"
          label="${this._('Select')}"
        ></grampsjs-form-select-object>
      </p>

      <mwc-button
        slot="primaryAction"
        dialogAction="ok"
        @click="${() => this._handleDialogSave(pos)}"
      >
        ${this._('_Save')}
      </mwc-button>
      <mwc-button
        slot="secondaryAction"
        dialogAction="cancel"
        @click="${this._handleDialogCancel}"
      >
        ${this._('Cancel')}
      </mwc-button>
    `
    this._openDialog()
  }

  _handleSelectObjectsChanged(e) {
    const url = this.shadowRoot.querySelector('#linkurl')
    if (url === null) {
      return
    }
    const [obj] = e.detail.objects
    if (obj.handle) {
      url.value = `gramps://${capitalize(obj.object_type)}/handle/${obj.handle}`
    }
  }

  _handleDialogSave(pos) {
    const url = this.shadowRoot.querySelector('#linkurl')
    if (url === null) {
      return
    }
    const {value} = url
    if (value) {
      // first remove, then add, to prevent overlapping tags
      this._removeTag('link', pos)
      this._insertTag('link', pos, value)
      this.handleChange()
    }
    this._dialogContent = ''
  }

  _handleDialogCancel() {
    this._dialogContent = ''
  }

  _renderLinkDialog() {
    return html` <mwc-dialog> ${this._dialogContent} </mwc-dialog> `
  }

  _openDialog() {
    const dialog = this.shadowRoot.querySelector('mwc-dialog')
    if (dialog !== null) {
      dialog.open = true
    }
  }

  _handleFormat(type) {
    const div = this.shadowRoot.querySelector('div.note')
    // workaround for Chrome & Firefox
    const range = this.shadowRoot.getSelection
      ? // Chrome
        this.shadowRoot.getSelection().getRangeAt(0)
      : // Firefox
        document.getSelection().getRangeAt(0)
    const nCharBefore1 = getNumCharBeforeNode(range.startContainer, div)[0]
    const nCharBefore2 = getNumCharBeforeNode(range.endContainer, div)[0]
    const pos = [
      nCharBefore1 + range.startOffset,
      nCharBefore2 + range.endOffset,
    ]
    if (isBooleanTag(type)) {
      if (this._hasTag(type, pos)) {
        // if it's a boolean tag and already selected in the whole range, remove it
        this._removeTag(type, pos)
      } else {
        this._insertTag(type, pos)
      }
    } else if (type === 'link') {
      if (this._hasTag(type, pos)) {
        // if there already is a link in the whole range, remove it
        this._removeTag(type, pos)
      } else {
        this._handleLink(pos)
      }
    }
    this.cursorPosition = pos
    this.handleChange()
  }

  handleChange() {
    // Dismiss banner on first edit
    if (this._showDraftBanner) {
      this._showDraftBanner = false
    }
    fireEvent(this, 'formdata:changed', {data: this.data})
    this._saveDraftDebounced()
  }

  _saveDraftDebounced() {
    // Clear existing timer
    if (this._draftSaveTimer) {
      clearTimeout(this._draftSaveTimer)
    }
    // Set new timer to save draft after 2000ms
    this._draftSaveTimer = setTimeout(() => {
      this._saveDraftNow()
    }, 2000)
  }

  _saveDraftNow() {
    // If data is empty, clear the draft instead of saving
    if (!this.data.string || this.data.string.trim() === '') {
      clearDraft(this._getStorageKey())
    } else {
      saveDraft(this._getStorageKey(), this.data)
    }
  }

  _handleBeforeUnload() {
    // Save draft immediately when page is closing/refreshing
    this._saveDraftNow()
  }

  _handleDismissBanner() {
    this._showDraftBanner = false
  }

  _handleDiscardDraft() {
    // Reset to original data and dismiss banner
    this.reset()
    this._showDraftBanner = false
  }

  _insertTag(tagname, range, value = null) {
    this.data = {
      ...this.data,
      tags: this._cleanTags([
        ...this.data.tags,
        {name: tagname, ranges: [range], value},
      ]),
    }
  }

  // FIXME
  _hasTag(tagname, range) {
    const tags = this._cleanTags(this.data.tags).filter(
      tag => tag.name === tagname
    )
    if (tags === undefined || tags.length === 0) {
      return false
    }
    // eslint-disable-next-line prefer-spread
    const ranges = [].concat
      .apply(
        [],
        tags.map(tag => tag.ranges || [])
      )
      .sort((r1, r2) => r1[0] - r2[0])
    let charCovered = 0
    for (let i = 0; i < ranges.length; i += 1) {
      if (ranges[i][1] <= range[0]) {
        // not there yet
      } else {
        // number of overlapping characters
        charCovered += Math.max(
          0,
          Math.min(ranges[i][1], range[1]) - Math.max(ranges[i][0], range[0])
        )
        if (ranges[i][0] >= range[1]) {
          // already passed
          break
        }
      }
    }
    // true if all characters overlapped
    if (charCovered === range[1] - range[0]) {
      return true
    }
    return false
  }

  _removeTag(tagname, range) {
    if (range[1] <= range[0]) {
      return
    }
    this.data = {
      ...this.data,
      tags: this._cleanTags([
        // tags of different type: don't touch
        ...this.data.tags.filter(tag => tag.name !== tagname),
        // tags of our type: change ranges
        ...this.data.tags
          .filter(tag => tag.name === tagname)
          .map(tag => ({
            ...tag,
            ranges: tag.ranges.reduce((rangesNew, tagRange) => {
              // no overlap
              if (tagRange[0] >= range[1] || tagRange[1] <= range[0]) {
                // just append
                return [...rangesNew, tagRange]
              }
              // inside
              if (tagRange[0] >= range[0] && tagRange[1] <= range[1]) {
                // don't append
                return rangesNew
              }
              // contains
              if (tagRange[0] < range[0] && tagRange[1] > range[1]) {
                // appent two parts
                return [
                  ...rangesNew,
                  [tagRange[0], range[0]],
                  [range[1], tagRange[1]],
                ]
              }
              // overlaps right
              if (tagRange[0] >= range[0]) {
                // cut at range[1]
                return [...rangesNew, [range[1], tagRange[1]]]
              }
              // overlaps left
              if (tagRange[1] <= range[1]) {
                // cut at range[0]
                return [...rangesNew, [tagRange[0], range[0]]]
              }
              return rangesNew
            }, []),
          })),
      ]),
    }
  }

  // sort, combine, and clean up tags
  _cleanTags(tags) {
    // get unique tag names
    let tagsClean = []
    // names corresponding to boolean tags
    const names = [...new Set(tags.map(tag => tag.name))]
    names.forEach(tagname => {
      const nameTags = tags.filter(tag => tag.name === tagname)
      if (isBooleanTag(tagname)) {
        tagsClean = [...tagsClean, ...this._cleanTagsBool(nameTags)]
      } else {
        tagsClean = [...tagsClean, ...this._cleanTagsNonBool(nameTags)]
      }
    })
    return tagsClean
  }

  // eslint-disable-next-line class-methods-use-this
  _cleanTagsBool(tags) {
    if (tags.length === 0) {
      return []
    }
    const {name} = tags[0]
    const ranges = tags
      // combine all ranges
      .reduce((arr, tag) => [...arr, ...tag.ranges], [])
      // sort by start index
      .sort((r1, r2) => r1[0] - r2[0])
      // drop vanishing ranges
      .filter(r => r[1] > r[0])
      .reduce((rangesNew, range) => {
        const L = rangesNew.length
        if (L > 0 && range[0] <= rangesNew[L - 1][1]) {
          // if range has overlap with previous, merge them
          const rangeMerged = [
            rangesNew[L - 1][0],
            Math.max(range[1], rangesNew[L - 1][1]),
          ]
          return [...rangesNew.slice(0, -1), rangeMerged]
        }
        // default: just append
        return [...rangesNew, range]
      }, [])
    return [{name, ranges, value: null}]
  }

  // eslint-disable-next-line class-methods-use-this
  _cleanTagsNonBool(tags) {
    if (tags.length === 0) {
      return []
    }
    // remove collapsed ranges, then tags that don't have ranges
    return tags
      .map(tag => ({
        ...tag,
        ranges: tag.ranges.filter(r => r[0] < r[1]),
      }))
      .filter(tag => tag.ranges.length > 0)
  }

  // insert string at position
  _insertText(str, position) {
    this.data = {
      ...this.data,
      // string is old data with str inserted in between
      string:
        this.data.string.slice(0, position) +
        str +
        this.data.string.slice(position),
      // for tags, need to shift by str.length all values after position
      tags: this._cleanTags(
        this.data.tags.map(tag => ({
          ...tag,
          ranges: tag.ranges.map(range =>
            range.map(x => (x < position ? x : x + str.length))
          ),
        }))
      ),
    }
  }

  // remove string between positions
  _deleteText(posStart, posEnd) {
    const d = posEnd - posStart
    if (d <= 0) {
      return
    }
    this.data = {
      ...this.data,
      // string is old data with str inserted in between
      string:
        this.data.string.slice(0, posStart) + this.data.string.slice(posEnd),
      // for tags, need to shift by str.length all values after position
      tags: this._cleanTags(
        this.data.tags.map(tag => ({
          ...tag,
          ranges: tag.ranges.map(range =>
            // eslint-disable-next-line no-nested-ternary
            range.map(x => (x < posStart ? x : x > posEnd ? x - d : posStart))
          ),
        }))
      ),
    }
  }

  updated(changed) {
    if (changed.has('data')) {
      this._html = this._getHtml()
    }
    // set selection
    const div = this.shadowRoot.querySelector('div.note')
    const nodeStart = getNodeAtNumChar(div, this.cursorPosition[0])
    if (nodeStart !== null) {
      const offsetStart = getNumCharBeforeNode(nodeStart, div)[0]
      // no selection but only cursor
      if (this.cursorPosition.length === 1) {
        this._setCursor(nodeStart, this.cursorPosition[0] - offsetStart)
      } else {
        // set selection range
        const nodeEnd = getNodeAtNumChar(div, this.cursorPosition[1])
        if (nodeEnd !== null) {
          const offsetEnd = getNumCharBeforeNode(nodeEnd, div)[0]
          this._setSelection(
            nodeStart,
            this.cursorPosition[0] - offsetStart,
            nodeEnd,
            this.cursorPosition[1] - offsetEnd
          )
        }
      }
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _setCursor(node, offset) {
    document.getSelection().collapse(node, offset)
  }

  // eslint-disable-next-line class-methods-use-this
  _setSelection(nodeStart, offsetStart, nodeEnd, offsetEnd) {
    const selection = window.getSelection()
    if (selection.rangeCount > 0) {
      selection.removeAllRanges()
    }
    const range = document.createRange()
    range.setStart(nodeStart, offsetStart)
    range.setEnd(nodeEnd, offsetEnd)
    selection.addRange(range)
  }

  _getTagArray() {
    const tags = this.data.tags || []
    const tagsNew = []
    tags.forEach(tag => {
      tag.ranges.forEach(range => {
        tagsNew.push([range[0], 'start', tag.name, tag.value])
        tagsNew.push([range[1], 'end', tag.name, tag.value])
      })
    })
    tagsNew.sort((a, b) => a[0] - b[0])
    return tagsNew
  }

  _getHtml() {
    let str = ''
    const tags = this._getTagArray()
    let activeTags = []
    let i = 0
    tags.forEach(tag => {
      const [j, t, name, value] = tag
      str = `${str}${
        j > i ? _applyTags(this.data.string.slice(i, j), activeTags) : ''
      }`
      if (t === 'start') {
        activeTags.push([name, value])
      } else {
        activeTags = activeTags.filter(_tag => _tag[0] !== name)
      }
      i = j
    })
    str = `${str}${_applyTags(this.data.string.slice(i), activeTags)}`
    return str
  }

  _handleSaveButton() {
    // Cancel any pending draft save
    if (this._draftSaveTimer) {
      clearTimeout(this._draftSaveTimer)
      this._draftSaveTimer = null
    }

    fireEvent(this, 'edit:action', {
      action: 'updateProp',
      data: {text: this.data},
    })
    fireEvent(this, 'edit-mode:off')
  }

  _handleCancel() {
    // Cancel any pending draft save
    if (this._draftSaveTimer) {
      clearTimeout(this._draftSaveTimer)
      this._draftSaveTimer = null
    }
    // Clear all drafts for this page/context when user explicitly cancels editing
    clearDraftsWithPrefix(this._getStorageKeyPrefix())
  }

  _handleSaved() {
    clearDraftsWithPrefix(this._getStorageKeyPrefix())
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('edit-mode:save', this._boundHandleSaveButton)
    window.addEventListener('beforeunload', this._boundHandleBeforeUnload)
    window.addEventListener('edit:cancel', this._boundHandleCancel)
    window.addEventListener('object:cancel', this._boundHandleCancel)
    window.addEventListener('edit:saved', this._boundHandleSaved)
  }

  disconnectedCallback() {
    window.removeEventListener('edit-mode:save', this._boundHandleSaveButton)
    window.removeEventListener('beforeunload', this._boundHandleBeforeUnload)
    window.removeEventListener('edit:cancel', this._boundHandleCancel)
    window.removeEventListener('object:cancel', this._boundHandleCancel)
    window.removeEventListener('edit:saved', this._boundHandleSaved)
    // Clear any pending draft save timer
    if (this._draftSaveTimer) {
      clearTimeout(this._draftSaveTimer)
      this._draftSaveTimer = null
    }
    super.disconnectedCallback()
  }
}

window.customElements.define('grampsjs-editor', GrampsjsEditor)
