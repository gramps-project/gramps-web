import {describe, it, expect} from 'vitest'

import {GrampsjsFaces} from '../../src/components/GrampsjsFaces.js'

function facesWithApiVersion(version) {
  const faces = new GrampsjsFaces()
  faces.appState = {dbInfo: {gramps_webapi: {version}}}
  faces._data = {data: [[20, 20, 40, 40]]}
  return faces
}

describe('GrampsjsFaces', () => {
  it('grows face rectangles from APIs older than 3.24', () => {
    expect(facesWithApiVersion('3.23.1')._getFaces()).toEqual([
      [17, 13, 43, 47],
    ])
  })

  it('keeps the rectangles of API 3.24 and newer', () => {
    expect(facesWithApiVersion('3.24.0')._getFaces()).toEqual([
      [20, 20, 40, 40],
    ])
  })
})
