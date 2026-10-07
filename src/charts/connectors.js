// Right-angled connectors between the cards of charts

// Largest radius in pixels of the rounded corners of links
export const cornerRadius = 8

export const sameX = (a, b) => Math.abs(a - b) < 0.5

export const samePoint = (a, b) => sameX(a[0], b[0]) && sameX(a[1], b[1])

// Returns an SVG path along `points`, whose lines are vertical or
// horizontal, with each corner rounded by up to `cornerRadius`. The first
// and last line can take their whole length for one corner; any other line
// half of its length for each of its two.
export function roundedPath(points) {
  const kept = points.filter(
    (point, i) => i === 0 || !samePoint(point, points[i - 1])
  )
  // Corners only, no points in the middle of a straight line
  const corners = kept.filter(
    (point, i) =>
      i === 0 ||
      i === kept.length - 1 ||
      !(
        (sameX(kept[i - 1][0], point[0]) && sameX(point[0], kept[i + 1][0])) ||
        (sameX(kept[i - 1][1], point[1]) && sameX(point[1], kept[i + 1][1]))
      )
  )
  const last = corners.length - 1
  const length = i =>
    Math.hypot(
      corners[i + 1][0] - corners[i][0],
      corners[i + 1][1] - corners[i][1]
    )
  let path = `M${corners[0].join(',')}`
  for (let i = 1; i < last; i += 1) {
    const [x, y] = corners[i]
    const [inLength, outLength] = [length(i - 1), length(i)]
    const radius = Math.min(
      cornerRadius,
      i === 1 ? inLength : inLength / 2,
      i === last - 1 ? outLength : outLength / 2
    )
    const [inX, inY] = [
      (x - corners[i - 1][0]) / inLength,
      (y - corners[i - 1][1]) / inLength,
    ]
    const [outX, outY] = [
      (corners[i + 1][0] - x) / outLength,
      (corners[i + 1][1] - y) / outLength,
    ]
    path += `L${x - inX * radius},${y - inY * radius}`
    path += `Q${x},${y} ${x + outX * radius},${y + outY * radius}`
  }
  return `${path}L${corners[last].join(',')}`
}
