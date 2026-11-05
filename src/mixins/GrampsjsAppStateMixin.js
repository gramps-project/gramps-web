/*
A mixin for components that have appState as a property.
Also makes them translatable.
*/

import {contextKey} from '../strings.js'

export const GrampsjsAppStateMixin = superClass =>
  class extends superClass {
    static get properties() {
      return {
        appState: {type: Object},
      }
    }

    constructor() {
      super()
      this.appState = {}
    }

    // md-select works out the text of its selected option only when the
    // selection changes, so after new strings are rendered into the options,
    // the selects of this component are told to read it again.
    update(changed) {
      const stringsChanged =
        changed.has('appState') &&
        changed.get('appState')?.i18n?.strings !== this.appState?.i18n?.strings
      super.update(changed)
      if (stringsChanged) {
        this.renderRoot
          ?.querySelectorAll?.('md-filled-select, md-outlined-select')
          .forEach(select => select.updateValueAndDisplayText?.())
      }
    }

    _(s, ...args) {
      if (this.appstate === null || this.appState?.i18n === undefined) {
        // this will only happen if we forgot to set appState on an element!
        console.log('Error: appState is null for element', this) // eslint-disable-line no-console
        return s
      }
      const {strings} = this.appState.i18n
      if (s === undefined) {
        return ''
      }
      let t = s
      if (s in strings) {
        t = strings[s]
      }
      t = t.replace('_', '')
      for (let i = 0; i <= args.length; i += 1) {
        t = t.replace('%s', args[i])
      }
      return t
    }

    // Translate a Gramps string that has a message context, like gettext's
    // pgettext. Without a translation for the context, it falls back to the
    // string without context.
    _p(context, s, ...args) {
      const key = contextKey(context, s)
      if (key in (this.appState?.i18n?.strings ?? {})) {
        return this._(key, ...args)
      }
      return this._(s, ...args)
    }

    get canUseChat() {
      return (
        this.appState.permissions.canUseChat &&
        this.appState.dbInfo?.server?.chat
      )
    }
  }
