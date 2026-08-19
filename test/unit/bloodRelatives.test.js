import {describe, expect, it} from 'vitest'
import {getSpouseHandles} from '../../src/views/GrampsjsViewBloodRelativesChart.js'

const person = (handle, families) => ({handle, extended: {families}})

describe('getSpouseHandles', () => {
  it('returns partners who are not blood relatives themselves', () => {
    const people = [
      person('me', [{father_handle: 'me', mother_handle: 'my_wife'}]),
      person('brother', [
        {father_handle: 'brother', mother_handle: 'sister_in_law'},
      ]),
    ]
    expect(getSpouseHandles(people).sort()).to.deep.equal([
      'my_wife',
      'sister_in_law',
    ])
  })

  it('excludes people already in the set and deduplicates', () => {
    const family = {father_handle: 'dad', mother_handle: 'mom'}
    const people = [
      person('dad', [family]),
      person('mom', [family]),
      person('child', []),
    ]
    expect(getSpouseHandles(people)).to.deep.equal([])
  })

  it('tolerates missing families and empty partner handles', () => {
    const people = [
      {handle: 'me'},
      person('sibling', [{father_handle: null, mother_handle: 'step_parent'}]),
    ]
    expect(getSpouseHandles(people)).to.deep.equal(['step_parent'])
  })
})
