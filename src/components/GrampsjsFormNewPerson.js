import {GrampsjsNewPersonMixin} from '../mixins/GrampsjsNewPersonMixin.js'
import {GrampsjsNewObjectTagsMixin} from '../mixins/GrampsjsNewObjectTagsMixin.js'
import {fireEvent} from '../util.js'
import './GrampsjsFormSelectType.js'
import {GrampsjsObjectForm} from './GrampsjsObjectForm.js'

export class GrampsjsFormNewPerson extends GrampsjsNewObjectTagsMixin(
  GrampsjsNewPersonMixin(GrampsjsObjectForm)
) {
  _handleDialogSave() {
    const processedData = this._processedData()

    const data = {
      processedData,
    }

    fireEvent(this, 'object:save', {data})
    this._reset()
  }
}

window.customElements.define('grampsjs-form-new-person', GrampsjsFormNewPerson)
