/*
A mixin for components that have appState as a property.
Also makes them translatable.
*/

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

    get canUseChat() {
      return (
        this.appState.permissions.canUseChat &&
        this.appState.dbInfo?.server?.chat
      )
    }
  }
