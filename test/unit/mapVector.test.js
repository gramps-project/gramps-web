import {describe, it, expect} from 'vitest'

import {parseVector, vectorBounds, vectorFormat} from '../../src/mapVector.js'

const KML = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Style id="red">
      <LineStyle><color>ff0000ff</color><width>3</width></LineStyle>
    </Style>
    <Placemark>
      <name>Parish</name>
      <styleUrl>#red</styleUrl>
      <Polygon><outerBoundaryIs><LinearRing>
        <coordinates>8,49 9,49 9,50 8,49</coordinates>
      </LinearRing></outerBoundaryIs></Polygon>
    </Placemark>
    <Placemark>
      <name>Church</name>
      <Point><coordinates>8.5,49.5</coordinates></Point>
    </Placemark>
  </Document>
</kml>`

describe('vectorFormat', () => {
  it('recognises KML and GeoJSON mime types', () => {
    expect(
      vectorFormat({mime: 'application/vnd.google-earth.kml+xml'})
    ).to.equal('kml')
    expect(vectorFormat({mime: 'application/geo+json'})).to.equal('geojson')
  })

  it('falls back to the file extension', () => {
    expect(vectorFormat({mime: 'text/xml', path: 'a/Parish.KML'})).to.equal(
      'kml'
    )
    expect(
      vectorFormat({mime: 'application/json', path: 'b/parish.geojson'})
    ).to.equal('geojson')
  })

  it('rejects other files, including plain JSON', () => {
    expect(vectorFormat({mime: 'application/json', path: 'x.json'})).to.equal(
      null
    )
    expect(vectorFormat({mime: 'image/png', path: 'map.png'})).to.equal(null)
    expect(vectorFormat({})).to.equal(null)
  })
})

describe('parseVector', () => {
  it('converts KML with its styles', () => {
    const fc = parseVector(KML, 'kml')
    expect(fc.type).to.equal('FeatureCollection')
    expect(fc.features.map(f => f.properties.name)).to.deep.equal([
      'Parish',
      'Church',
    ])
    expect(fc.features[0].geometry.type).to.equal('Polygon')
    expect(fc.features[0].properties.stroke).to.equal('#ff0000')
    expect(fc.features[1].geometry.coordinates).to.deep.equal([8.5, 49.5])
  })

  it('wraps a bare feature or geometry', () => {
    const geometry = {type: 'Point', coordinates: [1, 2]}
    const fromGeometry = parseVector(JSON.stringify(geometry), 'geojson')
    expect(fromGeometry.features[0].geometry).to.deep.equal(geometry)
    const feature = {type: 'Feature', geometry, properties: {name: 'A'}}
    const fromFeature = parseVector(JSON.stringify(feature), 'geojson')
    expect(fromFeature.features).to.deep.equal([feature])
  })

  it('returns null for unreadable files', () => {
    expect(parseVector('{not json', 'geojson')).to.equal(null)
    expect(parseVector('{"type": "Topology"}', 'geojson')).to.equal(null)
    expect(parseVector('<kml><Document>', 'kml')).to.equal(null)
    expect(parseVector('', 'gpx')).to.equal(null)
  })
})

describe('vectorBounds', () => {
  it('spans all features and geometry types', () => {
    const fc = parseVector(KML, 'kml')
    const other = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'GeometryCollection',
            geometries: [{type: 'Point', coordinates: [10, 48]}],
          },
          properties: {},
        },
      ],
    }
    expect(vectorBounds([fc, other])).to.deep.equal([
      [8, 48],
      [10, 50],
    ])
  })

  it('returns null without coordinates', () => {
    const empty = {type: 'FeatureCollection', features: []}
    expect(vectorBounds([empty])).to.equal(null)
    expect(vectorBounds([])).to.equal(null)
  })
})
