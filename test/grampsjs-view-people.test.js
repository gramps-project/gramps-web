import fetchMock from 'fetch-mock/esm/client';
import { html, fixture, expect } from '@open-wc/testing';

import '../src/views/GrampsjsViewPeople.js';

describe('GrampsjsViewPeople', () => {
  beforeEach(() => {
    fetchMock.get('http://localhost:5555/api/people/?profile=all', [
      {
        address_list: [],
        alternate_names: [],
        attribute_list: [],
        birth_ref_index: -1,
        change: 1185438865,
        citation_list: ['c140d245c0670fd78f6'],
        death_ref_index: -1,
        event_ref_list: [],
        family_list: ['TZ3KQCJ3PNQHI6S8VO'],
        gender: 0,
        gramps_id: 'I0552',
        handle: '004KQCGYT27EEPQHK',
        lds_ord_list: [],
        media_list: [],
        note_list: [],
        parent_family_list: [],
        person_ref_list: [],
        primary_name: {
          call: '',
          citation_list: [],
          date: {
            calendar: 0,
            dateval: [0, 0, 0, false],
            format: null,
            modifier: 0,
            newyear: 0,
            quality: 0,
            sortval: 0,
            text: '',
            year: 0,
          },
          display_as: 0,
          famnick: '',
          first_name: 'Martha',
          group_as: '',
          nick: '',
          note_list: [],
          private: false,
          sort_as: 0,
          suffix: '',
          surname_list: [
            {
              connector: '',
              origintype: '',
              prefix: '',
              primary: true,
              surname: 'Nielsen',
            },
          ],
          title: '',
          type: 'Birth Name',
        },
        private: false,
        profile: {
          birth: {},
          death: {},
          events: [],
          handle: '004KQCGYT27EEPQHK',
          name_given: 'Martha',
          name_surname: 'Nielsen',
          sex: 'F',
        },
        tag_list: [],
        urls: [],
      },
    ]);
  });

  afterEach(() => {
    fetchMock.restore();
  });

  it('test people view', async () => {
    const el = await fixture(html`
      <grampsjs-view-people class="page"></grampsjs-view-people>
    `);
  });

  it('passes the a11y audit', async () => {
    const el = await fixture(html`
      <grampsjs-view-people class="page"></grampsjs-view-people>
    `);

    await expect(el).shadowDom.to.be.accessible();
  });
});
