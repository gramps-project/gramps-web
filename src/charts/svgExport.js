import {exportPalette} from './palette.js'

// Space around the chart in an exported SVG, in pixels
const exportMargin = 20

// Returns the image at `url` as a data URI
async function fetchDataUri(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Image request failed with status ${response.status}`)
  }
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

// Returns the data URIs of the images at `urls` by URL, fetched with
// `fetchImage`. Images that cannot be fetched are left out.
async function imageDataUris(urls, fetchImage) {
  const unique = [...new Set(urls.filter(Boolean))]
  const results = await Promise.allSettled(unique.map(url => fetchImage(url)))
  return new Map(
    unique
      .map((url, i) => [url, results[i]])
      .filter(([, result]) => result.status === 'fulfilled')
      .map(([url, result]) => [url, result.value])
  )
}

// Returns a promise of `layout` drawn by a new `ChartClass` chart as a
// standalone SVG document, sized to the layout's bounds independent of zoom
// and container size. Colours come from `exportPalette` on a white
// background, and there are no shadows, interactive elements or content that
// is placed in the view, such as a legend. `options` are the update options
// of the live chart. The images from its `getImageUrl`, if it has one, are
// fetched with `fetchImage` and embedded as data URIs, so no image URL, which
// can carry the access token, is written to the file. A card whose image
// cannot be fetched has no image.
export async function chartSvgDocument(
  ChartClass,
  layout,
  options = {},
  {fetchImage = fetchDataUri} = {}
) {
  const chart = new ChartClass()
  const {getImageUrl} = options
  const people = getImageUrl
    ? chart.drawnNodes(layout).filter(node => chart.isPerson(node))
    : []
  // Image URLs carry the access token, which can be refreshed while the
  // images are fetched, so each node's URL is read once
  const urls = new Map(people.map(node => [node, getImageUrl(node)]))
  const dataUris = await imageDataUris([...urls.values()], fetchImage)
  chart.update(layout, {
    ...options,
    interactive: false,
    palette: exportPalette,
    getImageUrl: node => dataUris.get(urls.get(node)) ?? '',
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
  for (const child of [...svg.children]) {
    if (child.id !== 'chart-content') {
      child.remove()
    }
  }
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
