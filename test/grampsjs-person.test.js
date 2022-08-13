import { html, fixture, expect } from '@open-wc/testing';

import '../src/components/GrampsjsPerson.js';

describe('GrampsjsPerson', () => {
  const testData = {
    some_key: 1,
  };
  it('test data', async () => {
    const el = await fixture(html`
      <grampsjs-person .data=${testData}></grampsjs-person>
    `);

    expect(el.data).to.equal(testData);
  });

  it('passes the a11y audit', async () => {
    const el = await fixture(html` <grampsjs-person></grampsjs-person> `);

    await expect(el).shadowDom.to.be.accessible();
  });
});
