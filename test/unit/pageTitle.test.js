import {describe, it, expect} from 'vitest'
import {pageTitleParts, pageTitleDetail} from '../../src/routing.js'
import {render} from 'lit'
import '../../src/components/GrampsjsAppBar.js'

describe('pageTitleParts', () => {
  it('names the home page', () => {
    expect(pageTitleParts({page: 'home', pageId: ''})).toEqual([
      {title: 'Home'},
    ])
  })

  it('names the timeline and help pages', () => {
    expect(pageTitleParts({page: 'timeline', pageId: ''})).toEqual([
      {title: 'Timeline'},
    ])
    expect(pageTitleParts({page: 'help', pageId: ''})).toEqual([
      {title: 'Help'},
    ])
  })

  it('puts list pages under Lists', () => {
    expect(pageTitleParts({page: 'people', pageId: ''})).toEqual([
      {title: 'Lists', href: '/people'},
      {title: 'People'},
    ])
  })

  it('leads from an object page to its list', () => {
    expect(pageTitleParts({page: 'person', pageId: 'I0044'})).toEqual([
      {title: 'People', href: '/people'},
      {title: 'I0044', literal: true},
    ])
  })

  it('names each DNA page', () => {
    expect(pageTitleParts({page: 'dna-matches', pageId: 'I1'})).toEqual([
      {title: 'DNA matches'},
    ])
    expect(pageTitleParts({page: 'dna-chromosome', pageId: 'I1'})).toEqual([
      {title: 'Chromosome Browser'},
    ])
    expect(pageTitleParts({page: 'ydna', pageId: ''})).toEqual([
      {title: 'Y-DNA'},
    ])
  })

  it('leads from a DNA match back to the matches of the person', () => {
    expect(
      pageTitleParts({page: 'dna-matches', pageId: 'I1', pageId2: 'I2'})
    ).toEqual([{title: 'DNA matches', href: '/dna-matches/I1'}])
  })

  it('leads from a media object to the media list', () => {
    expect(pageTitleParts({page: 'media', pageId: 'O0001'})[0]).toEqual({
      title: 'Media',
      href: '/medialist',
    })
  })

  it('leads from a task and a revision to their lists', () => {
    expect(pageTitleParts({page: 'task', pageId: 'S0001'})[0].href).toBe(
      '/tasks'
    )
    expect(pageTitleParts({page: 'revision', pageId: '12'})[0].href).toBe(
      '/revisions'
    )
  })

  it('names the settings tab', () => {
    expect(pageTitleParts({page: 'settings', pageId: 'users'})).toEqual([
      {title: 'Settings', href: '/settings/user'},
      {title: 'Manage users'},
    ])
  })

  it('names a page by its title alone', () => {
    expect(pageTitleParts({page: 'map', pageId: ''})).toEqual([{title: 'Map'}])
  })

  it('leaves pages without a title empty', () => {
    expect(pageTitleParts({page: 'new_person', pageId: ''})).toEqual([])
  })

  it('leads from a report to the reports once its name is known', () => {
    const path = {page: 'report', pageId: 'ancestor_chart'}
    expect(pageTitleParts(path)).toEqual([{title: '_Reports'}])
    expect(pageTitleParts(path, 'Ancestor Tree')).toEqual([
      {title: '_Reports', href: '/reports'},
      {title: 'Ancestor Tree'},
    ])
  })
})

describe('pageTitleDetail', () => {
  const reported = {page: 'report', pageId: 'ancestor_chart', title: 'X'}

  it('returns the title reported for the current page', () => {
    expect(
      pageTitleDetail({page: 'report', pageId: 'ancestor_chart'}, reported)
    ).toBe('X')
  })

  it('ignores a title reported for another page', () => {
    expect(
      pageTitleDetail({page: 'report', pageId: 'family_group'}, reported)
    ).toBe('')
    expect(pageTitleDetail({page: 'reports', pageId: ''}, reported)).toBe('')
    expect(pageTitleDetail({page: 'report', pageId: 'x'}, null)).toBe('')
  })
})

describe('app bar title', () => {
  const titleOf = path => {
    const bar = new (customElements.get('grampsjs-app-bar'))()
    bar.appState = {
      i18n: {strings: {}, lang: 'en'},
      path,
      dbInfo: {},
      permissions: {},
    }
    const root = document.createElement('div')
    render(bar._renderPageTitle(), root)
    return root
  }

  it('links a lone title that leads up from the current page', () => {
    const root = titleOf({page: 'dna-matches', pageId: 'I1', pageId2: 'I2'})
    const link = root.querySelector('a')
    expect(link.getAttribute('href')).toBe('/dna-matches/I1')
    expect(link.textContent).toBe('DNA matches')
    expect(root.querySelector('[aria-current]')).toBeNull()
  })

  it('marks the last part of other titles as the current page', () => {
    const root = titleOf({page: 'dna-matches', pageId: 'I1', pageId2: ''})
    expect(root.querySelector('a')).toBeNull()
    expect(root.querySelector('[aria-current]').textContent).toBe('DNA matches')
  })
})
