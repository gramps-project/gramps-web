import {exportPalette} from './palette.js'

// Space around the chart in an exported SVG, in pixels
const exportMargin = 20

// Returns `layout` drawn by a new `ChartClass` canvas as a standalone SVG
// document, sized to the layout's bounds independent of zoom and container
// size. Cards have no images, colours come from `exportPalette` on a white
// background, and there are no shadows or interactive elements. `options` are
// the update options of the live chart.
export function chartSvgDocument(ChartClass, layout, options = {}) {
  const chart = new ChartClass()
  chart.update(layout, {
    ...options,
    interactive: false,
    palette: exportPalette,
    getImageUrl: () => '',
    duration: 0,
    bboxWidth: 0,
    bboxHeight: 0,
  })
  // A copy has none of the zoom state and event handlers of the canvas
  const svg = chart.node.cloneNode(true)
  const {xMin, xMax, yMin, yMax} = layout.bounds
  const x = xMin - exportMargin
  const y = yMin - exportMargin
  const width = xMax - xMin + 2 * exportMargin
  const height = yMax - yMin + 2 * exportMargin
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  svg.setAttribute('width', width)
  svg.setAttribute('height', height)
  svg.setAttribute('viewBox', [x, y, width, height].join(' '))
  svg.setAttribute('font-family', "'Inter var', sans-serif")
  svg.removeAttribute('style')
  svg.querySelector('#chart-content').removeAttribute('transform')
  for (const element of svg.querySelectorAll('[style=""]')) {
    element.removeAttribute('style')
  }
  const background = svg.ownerDocument.createElementNS(
    'http://www.w3.org/2000/svg',
    'rect'
  )
  background.setAttribute('x', x)
  background.setAttribute('y', y)
  background.setAttribute('width', width)
  background.setAttribute('height', height)
  background.setAttribute('fill', exportPalette.background)
  svg.prepend(background)
  const markup = new XMLSerializer().serializeToString(svg)
  return `<?xml version="1.0" encoding="UTF-8"?>\n${markup}\n`
}

// Saves `content` as an SVG file named `filename` in the browser's downloads
export function downloadSvg(content, filename) {
  const url = URL.createObjectURL(new Blob([content], {type: 'image/svg+xml'}))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
