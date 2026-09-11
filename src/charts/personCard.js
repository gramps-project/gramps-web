import {select} from 'd3-selection'
import {chartNameDisplayFormat, fireEvent} from '../util.js'
import {
  appendAddPersonButton,
  colorAddPersonButtons,
} from './addPersonButton.js'
import {chartPalette} from './palette.js'

// Pattern ids must be unique in the document, and the same person can be
// shown in several cards
let imagePatternCount = 0

// Shortens `s` to fit `length` pixels, estimating the character width
function clipString(s, length) {
  if (!s) {
    return ''
  }
  const fontSize = 13
  const nChar = length / (fontSize * 0.6)
  if (s.length <= nChar) {
    return s
  }
  if (nChar < 2) {
    return ''
  }
  return `${s.slice(0, nChar - 2)}…`
}

function isHoverDevice() {
  return !window.matchMedia('(hover: none)').matches
}

// Appends the visible part of a person card, centred on each node of the
// selection. `profile(d)` returns the person's profile, and `imageUrl(d)`
// returns the URL of their image or an empty string. Colours come from
// `palette`.
export function appendPersonCard(
  nodes,
  {
    profile,
    imageUrl = () => '',
    boxWidth = 190,
    boxHeight = 90,
    imgPadding = 10,
    nameDisplayFormat = chartNameDisplayFormat.surnameThenGiven,
    palette = chartPalette,
  }
) {
  const left = -boxWidth / 2
  const top = -boxHeight / 2
  const imgRadius = (boxHeight - imgPadding * 2) / 2
  const textPadding = d =>
    imageUrl(d) ? 2 * imgRadius + 2 * imgPadding : 2 * imgPadding

  nodes
    .append('rect')
    .attr('fill', d => palette.sex[profile(d)?.sex] ?? palette.sex.U)
    .attr('x', left - 4)
    .attr('y', top + 0.5)
    .attr('width', 24)
    .attr('height', boxHeight - 1)
    .attr('rx', 12)
    .attr('ry', 12)

  nodes
    .append('rect')
    .attr('fill', palette.personBox)
    .attr('x', left)
    .attr('y', top)
    .attr('width', boxWidth)
    .attr('height', boxHeight)
    .attr('rx', 8)
    .attr('ry', 8)

  const surnameFirst =
    nameDisplayFormat === chartNameDisplayFormat.surnameThenGiven
  const hasName = p => p?.name_given || p?.name_surname
  const lines = [
    {
      show: hasName,
      text: p =>
        surnameFirst ? `${p.name_surname || '…'},` : p.name_given || '…',
      weight: 500,
    },
    {
      show: hasName,
      text: p => (surnameFirst ? p.name_given || '…' : p.name_surname || '…'),
      weight: 500,
    },
    {show: p => p?.birth?.date, text: p => `*${p.birth.date}`, weight: 350},
    {show: p => p?.death?.date, text: p => `†${p.death.date}`, weight: 350},
  ]
  lines.forEach((line, i) => {
    nodes
      .filter(d => line.show(profile(d)))
      .append('text')
      .attr('x', d => left + textPadding(d))
      .attr('y', top + 25 + 17 * i)
      .attr('text-anchor', 'start')
      .attr('font-weight', line.weight)
      .attr('fill', palette.text)
      .attr('paint-order', 'stroke')
      .text(d => clipString(line.text(profile(d)), boxWidth - textPadding(d)))
  })

  nodes
    .filter(d => imageUrl(d))
    .each(function (d) {
      imagePatternCount += 1
      const patternId = `person-card-image-${imagePatternCount}`
      const node = select(this)
      node
        .append('defs')
        .append('pattern')
        .attr('id', patternId)
        .attr('width', 1)
        .attr('height', 1)
        .append('image')
        .attr('width', 2 * imgRadius)
        .attr('height', 2 * imgRadius)
        .attr('xlink:href', imageUrl(d))
      node
        .append('circle')
        .attr('r', imgRadius)
        .attr('cx', left + imgPadding + imgRadius)
        .attr('cy', top + imgPadding + imgRadius)
        .attr('fill', `url(#${patternId})`)
    })
}

// Sets click and hover handling on each node of the selection, and adds the
// add person button in edit mode. Calling it again updates the nodes in place.
export function setPersonCardInteraction(
  nodes,
  {
    profile,
    handle,
    boxWidth = 190,
    boxHeight = 90,
    canEdit = false,
    palette = chartPalette,
  }
) {
  nodes
    .style('cursor', canEdit ? 'default' : 'pointer')
    .on('click', function (event, d) {
      const grampsId = profile(d)?.gramps_id
      if (!canEdit && grampsId) {
        fireEvent(this, 'pedigree:person-selected', {grampsId})
      }
    })
    .on('mouseenter', function (event, d) {
      const grampsId = profile(d)?.gramps_id
      if (canEdit || !grampsId || !isHoverDevice()) {
        return
      }
      fireEvent(window, 'object:preview-show', {
        objectType: 'person',
        grampsId,
        anchorRect: this.getBoundingClientRect(),
        chart: true,
      })
    })
    .on('mouseleave', () => {
      if (isHoverDevice()) {
        fireEvent(window, 'object:preview-hide')
      }
    })

  if (!canEdit) {
    nodes.selectAll('.add-person-btn').remove()
    return
  }
  // Selecting existing buttons passes them the current data of their node
  colorAddPersonButtons(nodes.select('.add-person-btn'), palette)
  appendAddPersonButton(
    nodes.filter(function () {
      return !this.querySelector('.add-person-btn')
    }),
    boxWidth / 2 - 14,
    -boxHeight / 2 + 14,
    handle,
    palette
  )
}

// Removes what `setPersonCardInteraction` added: click and hover handling,
// cursors and add person buttons
export function clearPersonCardInteraction(nodes) {
  nodes
    .style('cursor', null)
    .on('click mouseenter mouseleave', null)
    .selectAll('.add-person-btn')
    .remove()
}
