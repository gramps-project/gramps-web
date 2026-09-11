import {afterEach, beforeEach, describe, it, expect} from 'vitest'
import {create} from 'd3-selection'
import {appendPersonCard} from '../../src/charts/personCard.js'
import {chartNameDisplayFormat} from '../../src/util.js'

const XLINK = 'http://www.w3.org/1999/xlink'

const people = {
  full: {
    handle: 'h1',
    profile: {
      gramps_id: 'I1',
      name_given: 'Anna',
      name_surname: 'Berg',
      sex: 'F',
      birth: {date: '1900'},
      death: {date: '1980'},
    },
  },
  noSurname: {
    handle: 'h2',
    profile: {gramps_id: 'I2', name_given: 'Carl', sex: 'M'},
  },
  noGiven: {
    handle: 'h3',
    profile: {gramps_id: 'I3', name_surname: 'Doe', sex: 'X'},
    image: 'https://example.org/doe.jpg',
  },
  longName: {
    handle: 'h4',
    profile: {
      gramps_id: 'I4',
      name_given: 'Bartholomew',
      name_surname: 'Featherstonehaugh-Montgomery',
      sex: 'U',
    },
  },
  notFetched: {},
}

let selected
const onSelected = e => selected.push(e.detail)

beforeEach(() => {
  selected = []
  window.addEventListener('pedigree:person-selected', onSelected)
})

afterEach(() => {
  window.removeEventListener('pedigree:person-selected', onSelected)
  document.body.replaceChildren()
})

function renderCards(options = {}) {
  const svg = create('svg')
  document.body.append(svg.node())
  const nodes = svg.selectAll('g').data(Object.values(people)).join('g')
  appendPersonCard(nodes, {
    profile: d => d.profile,
    handle: d => d.handle,
    imageUrl: d => d.image || '',
    ...options,
  })
  return Object.fromEntries(
    Object.keys(people).map((key, i) => [key, nodes.nodes()[i]])
  )
}

const texts = node => [...node.querySelectorAll('text')].map(t => t.textContent)

const click = node =>
  node.dispatchEvent(new MouseEvent('click', {bubbles: true}))

describe('appendPersonCard', () => {
  it('shows the surname first with placeholders for missing names', () => {
    const cards = renderCards()
    expect(texts(cards.full)).toEqual(['Berg,', 'Anna', '*1900', '†1980'])
    expect(texts(cards.noSurname)).toEqual(['…,', 'Carl'])
    expect(texts(cards.noGiven)).toEqual(['Doe,', '…'])
    expect(texts(cards.notFetched)).toEqual([])
  })

  it('shows the given name first when configured', () => {
    const cards = renderCards({
      nameDisplayFormat: chartNameDisplayFormat.givenThenSurname,
    })
    expect(texts(cards.full)).toEqual(['Anna', 'Berg', '*1900', '†1980'])
    expect(texts(cards.noSurname)).toEqual(['Carl', '…'])
  })

  it('shortens names that do not fit', () => {
    const [surname] = texts(renderCards().longName)
    expect(surname.endsWith('…')).toBe(true)
    expect(surname.length).toBeLessThan('Featherstonehaugh-Montgomery,'.length)
  })

  it('colours the bar by sex', () => {
    const cards = renderCards()
    const barColor = node => node.querySelector('rect').getAttribute('fill')
    expect(barColor(cards.full)).toBe('var(--color-girl)')
    expect(barColor(cards.noSurname)).toBe('var(--color-boy)')
    expect(barColor(cards.noGiven)).toBe('var(--color-other)')
    expect(barColor(cards.longName)).toBe('var(--color-unknown)')
    expect(barColor(cards.notFetched)).toBe('var(--color-unknown)')
  })

  it('draws images with unique pattern ids', () => {
    const first = renderCards().noGiven
    const second = renderCards().noGiven
    const patternId = node => node.querySelector('pattern').id
    expect(first.querySelector('circle').getAttribute('fill')).toBe(
      `url(#${patternId(first)})`
    )
    expect(
      first.querySelector('pattern image').getAttributeNS(XLINK, 'href')
    ).toBe('https://example.org/doe.jpg')
    expect(patternId(first)).not.toBe(patternId(second))
    expect(renderCards().full.querySelector('circle')).toBeNull()
  })

  it('selects the person on click', () => {
    const cards = renderCards()
    click(cards.full)
    click(cards.notFetched)
    expect(selected).toEqual([{grampsId: 'I1'}])
  })

  it('shows the add person button and ignores clicks in edit mode', () => {
    const cards = renderCards({canEdit: true})
    expect(cards.full.querySelectorAll('.add-person-btn')).toHaveLength(1)
    click(cards.full)
    expect(selected).toEqual([])
  })
})
