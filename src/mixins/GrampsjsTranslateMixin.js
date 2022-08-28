/*
A mixin for translatable components/views
*/

export const GrampsjsTranslateMixin = superClass =>
  class extends superClass {
    static get properties() {
      return {
        strings: {type: Object},
      }
    }

    constructor() {
      super()
      this.strings = {}
    }

    _(s, ...args) {
      if (s === undefined) {
        return ''
      }
      let t = s
      if (s in this.strings) {
        t = this.strings[s]
      }
      t = t.replace('_', '')
      for (let i = 0; i <= args.length; i += 1) {
        t = t.replace('%s', args[i])
      }
      return t
    }
  }
