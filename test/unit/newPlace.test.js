import {describe, it, expect} from 'vitest'
import {GrampsjsFormNewPlace} from '../../src/components/GrampsjsFormNewPlace.js'
import {GrampsjsViewNewPlace} from '../../src/views/GrampsjsViewNewPlace.js'

describe('new place: creating the enclosing place', () => {
  it('is offered in the New Place view', () => {
    expect(new GrampsjsViewNewPlace().allowNewEnclosedBy).toBe(true)
  })

  it('is not offered in the create dialog of an object selector', () => {
    expect(new GrampsjsFormNewPlace().allowNewEnclosedBy).toBe(false)
  })
})
