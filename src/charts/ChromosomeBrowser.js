import {create} from 'd3-selection'
import {scaleBand, scaleLinear, scaleOrdinal} from 'd3-scale'
import {axisLeft} from 'd3-axis'
import {schemeSet1} from 'd3-scale-chromatic'

const chromosomeLength = {
  1: 249250621,
  2: 243199373,
  3: 198022430,
  4: 191154276,
  5: 180915260,
  6: 171115067,
  7: 159138663,
  8: 146364022,
  9: 141213431,
  10: 135534747,
  11: 135006516,
  12: 133851895,
  13: 115169878,
  14: 107349540,
  15: 102531392,
  16: 90354753,
  17: 81195210,
  18: 78077248,
  19: 59128983,
  20: 63025520,
  21: 48129895,
  22: 51304566,
  X: 155270560,
}

export function ChromosomeBrowser(
  data,
  {
    fontFamily = 'Inter var',
    fontSize = 16,
    fontWeight = 350,
    fontColor = 'rgba(0, 0, 0, 0.8)',
    width = 800,
    margin = {top: 0, right: 10, bottom: 0, left: 35},
    interGroupPadding = 0.2,
    intraGroupPadding = 0.15,
    barHeight = 11,
    tickPadding = 13,
    colorP = '#EEF1F5',
    colorM = '#F9ECEE',
  } = {}
) {
  const groups = Object.keys(chromosomeLength)
  const subgroups = ['P', 'M']

  const dataChromo = groups.map(key => ({
    group: key,
    P: chromosomeLength[key],
    M: chromosomeLength[key],
  }))

  const groupHeight =
    (2 + (1 * intraGroupPadding) / (1 - intraGroupPadding)) * barHeight

  const height =
    (dataChromo.length +
      ((dataChromo.length + 1) * interGroupPadding) / (1 - interGroupPadding)) *
    groupHeight

  // append the svg object to the body of the page
  const svg = create('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .attr('style', 'max-width: 100%; height: intrinsic;')
    .attr('font-family', fontFamily)
    .attr('font-size', fontSize)
    .attr('font-weight', fontWeight)

  const keys = data.map(obj => obj.handle)
  const colorScale = scaleOrdinal().domain(keys).range(schemeSet1)

  svg
    .append('defs')
    .selectAll('pattern')
    .data(data)
    .join('pattern')
    .attr('id', (d, i) => `pattern-${i}`)
    .attr('width', 8)
    .attr('height', 8)
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('patternTransform', 'rotate(45)')
    .append('rect')
    .attr('width', 4)
    .attr('height', 8)
    .attr('style', d => `fill:${colorScale(d.handle)}`)

  const node = svg
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)
  // Add Y axis
  const y = scaleBand()
    .domain(groups)
    .range([0, height])
    .padding([interGroupPadding])

  node
    .append('g')
    .call(axisLeft(y).tickSize(0).tickPadding(tickPadding))
    .attr('font-family', fontFamily)
    .attr('font-size', fontSize)
    .attr('color', fontColor)
    .attr('stroke-width', 0)

  // Add X axis
  const x = scaleLinear().domain([0, 249250621]).range([0, width])

  // Another scale for subgroup position?
  const ySubgroup = scaleBand()
    .domain(subgroups)
    .range([0, y.bandwidth()])
    .paddingInner([intraGroupPadding])

  // color palette = one color per subgroup
  const color = scaleOrdinal().domain(subgroups).range([colorP, colorM])

  // Show the bars
  node
    .append('g')
    .selectAll('g')
    // Enter in data = loop group per group
    .data(dataChromo)
    .join('g')
    .attr('transform', d => `translate(0, ${y(d.group)})`)
    .selectAll('rect')
    .data(d => subgroups.map(key => ({key, value: d[key]})))
    .join('rect')
    .attr('y', d => ySubgroup(d.key))
    .attr('x', 0)
    .attr('rx', 2)
    .attr('width', d => x(d.value))
    .attr('height', ySubgroup.bandwidth())
    .attr('fill', d => color(d.key))

  node
    .append('g')
    .selectAll('g')
    // .data(data.filter(obj => 'handle' in obj))
    .data(data)
    .join('g')
    .selectAll('g')
    .data((d, i) =>
      d.segments.map(segment => ({...segment, handle: d.handle, index: i}))
    )
    .join('g')
    .attr('transform', d => `translate(0, ${y(d.chromosome)})`)
    .selectAll('rect')
    .data((d, i) =>
      subgroups
        .filter(side => side === d.side || (d.side === 'U' && side === 'P'))
        .map(side => ({
          ...d,
          subgroup: side,
          color: colorScale(d.handle),
          segmentIndex: i,
        }))
    )
    .join('rect')
    .attr('y', d => ySubgroup(d.subgroup))
    .attr('x', d => x(d.start))
    .attr('rx', 2)
    .attr('width', d => x(d.stop - d.start))
    .attr('height', d =>
      d.side === 'U' ? y.bandwidth() : ySubgroup.bandwidth()
    )
    .attr('fill', d => (d.side === 'U' ? `url(#pattern-${d.index})` : d.color))
    .attr('opacity', 0.8)
    .attr('id', d => `rect-segment-${d.handle}-${d.start}-${d.stop}`)

  return svg.node()
}
