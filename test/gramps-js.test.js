import {html, fixture, expect} from '@open-wc/testing'

import '../src/gramps-js.js'

describe('GrampsJs', () => {
  let element
  beforeEach(async () => {
    element = await fixture(html` <gramps-js></gramps-js> `)
  })

  it('passes the a11y audit', async () => {
    await expect(element).shadowDom.to.be.accessible()
  })
})
