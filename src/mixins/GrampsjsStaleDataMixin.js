/* Mixing for views that need to handle stale data lazily.
 * This mixin listens for database changes and marks the data as stale.
 * When the view becomes active, it fetches the latest data.
 */
export const GrampsjsStaleDataMixin = superClass =>
  class extends superClass {
    static get properties() {
      return {
        _isStale: {type: Boolean, attribute: false},
      }
    }

    constructor() {
      super()
      this._isStale = false
      this._boundHandleDbChanged = this._handleDbChanged.bind(this)
    }

    connectedCallback() {
      super.connectedCallback()
      window.addEventListener('db:changed', this._boundHandleDbChanged)
    }

    disconnectedCallback() {
      super.disconnectedCallback()
      window.removeEventListener('db:changed', this._boundHandleDbChanged)
    }

    _handleDbChanged() {
      if (this.active) {
        this.handleUpdateStaleData()
      } else {
        this._isStale = true
      }
    }

    // eslint-disable-next-line class-methods-use-this
    handleUpdateStaleData() {
      // implement in subclass
    }

    update(changed) {
      super.update(changed)
      if (changed.has('active') && this.active && this._isStale) {
        this.handleUpdateStaleData()
        this._isStale = false
      }
    }
  }
