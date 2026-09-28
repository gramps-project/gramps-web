/*
Read-only access to buildings on Wikidata, used by the map's building layer.
The queries follow the data model of Domus (https://domus.genealogy.net).
*/

const DEFAULT_SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql'

export const WIKIDATA_MIN_ZOOM = 14
export const WIKIDATA_BUILDINGS_LIMIT = 3000

// Types that Wikidata files outside the building hierarchy, as listed by
// Domus: farm, farmstead, manor estate, four-sided farm, Meierhof, Baltic
// estate and building complex.
const EXTRA_BUILDING_TYPES = [
  'Q131596',
  'Q72030539',
  'Q2116450',
  'Q2523674',
  'Q477195',
  'Q2066754',
  'Q1497364',
]

const BUILDING = 'Q41176'
const TYPE_OF_BUILDING = 'Q811102'

export interface Bounds {
  west: number
  south: number
  east: number
  north: number
}

export function padBounds(
  {west, south, east, north}: Bounds,
  fraction: number
): Bounds {
  const dx = (east - west) * fraction
  const dy = (north - south) * fraction
  return {
    west: west - dx,
    south: south - dy,
    east: east + dx,
    north: north + dy,
  }
}

export function containsBounds(outer: Bounds, inner: Bounds): boolean {
  return (
    outer.west <= inner.west &&
    outer.south <= inner.south &&
    outer.east >= inner.east &&
    outer.north >= inner.north
  )
}

export interface WikidataBuilding {
  qid: string
  label: string
  lat: number
  long: number
  inceptionYear: number | null
  demolishedYear: number | null
}

export interface WikidataTime {
  /** SPARQL dateTime literal, e.g. "1650-01-01T00:00:00Z" */
  time: string
  /** 9 = year, 10 = month, 11 = day; smaller values are coarser */
  precision: number
}

export interface DatedEntry {
  label: string
  start: WikidataTime | null
  end: WikidataTime | null
}

export interface DatedItem extends DatedEntry {
  qid: string | null
}

export interface WikidataBuildingDetail {
  label: string
  description: string
  types: string[]
  image: string
  inception: WikidataTime | null
  demolished: WikidataTime | null
  occupants: DatedItem[]
  owners: DatedItem[]
  addresses: DatedEntry[]
  govId: string
  genWikiId: string
}

interface SparqlBinding {
  value: string
}

type SparqlRow = Record<string, SparqlBinding | undefined>

interface SparqlResult {
  results?: {bindings?: SparqlRow[]}
}

export type QueryResult<T> =
  | {data: T; truncated?: boolean}
  | {error: string; status?: number}

function getEndpoint(): string {
  const config = (
    window as {grampsjsConfig?: {mapWikidataSparqlEndpoint?: string}}
  ).grampsjsConfig
  return config?.mapWikidataSparqlEndpoint || DEFAULT_SPARQL_ENDPOINT
}

export function wikidataLanguages(lang?: string): string {
  const code = (lang || 'en').replaceAll('_', '-').toLowerCase()
  const base = code.split('-')[0]
  return [...new Set([code, base, 'en', 'mul'])].join(',')
}

export function qidFromUri(uri?: string): string | null {
  const match = /\/(Q\d+)$/.exec(uri ?? '')
  return match ? match[1] : null
}

export function parseWktPoint(
  wkt?: string
): {lat: number; long: number} | null {
  const match = /Point\(([-+\d.eE]+)\s+([-+\d.eE]+)\)/.exec(wkt ?? '')
  if (!match) return null
  const long = parseFloat(match[1])
  const lat = parseFloat(match[2])
  if (!Number.isFinite(lat) || !Number.isFinite(long)) return null
  return {lat, long}
}

// Year of a SPARQL dateTime literal such as "1650-01-01T00:00:00Z".
// Unknown values come back as blank-node URIs and yield null.
export function wikidataYear(dateTime?: string): number | null {
  const match = /^([+-]?\d+)-\d\d-\d\dT/.exec(dateTime ?? '')
  return match ? parseInt(match[1], 10) : null
}

function coord(value: number): string {
  return value.toFixed(6)
}

// A building is an item whose type, or the type's parent or grandparent, is
// "building", one of the extra types, or an instance of "type of building".
// Walking the full subclass hierarchy is too slow for dense city centres.
// The named subquery makes Blazegraph evaluate the bounding box first.
export function buildBuildingsQuery(
  {west, south, east, north}: Bounds,
  lang?: string
): string {
  const roots = [...EXTRA_BUILDING_TYPES, BUILDING]
    .map(qid => `wd:${qid}`)
    .join(', ')
  return `SELECT ?item ?itemLabel ?coord ?inception ?demolished
WITH {
  SELECT DISTINCT ?item WHERE {
    SERVICE wikibase:box {
      ?item wdt:P625 ?c .
      bd:serviceParam wikibase:cornerSouthWest "Point(${coord(west)} ${coord(
    south
  )})"^^geo:wktLiteral .
      bd:serviceParam wikibase:cornerNorthEast "Point(${coord(east)} ${coord(
    north
  )})"^^geo:wktLiteral .
    }
    ?item wdt:P31 ?type .
    ?type wdt:P279?/wdt:P279? ?r .
    FILTER(?r IN (${roots}) || EXISTS { ?r wdt:P31 wd:${TYPE_OF_BUILDING} })
  }
  LIMIT ${WIKIDATA_BUILDINGS_LIMIT}
} AS %buildings
WHERE {
  INCLUDE %buildings .
  ?item wdt:P625 ?coord .
  OPTIONAL { ?item wdt:P571 ?inception . }
  OPTIONAL { ?item wdt:P576 ?demolished . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "${wikidataLanguages(
    lang
  )}" . }
}`
}

export function parseBuildings(json: SparqlResult): WikidataBuilding[] {
  const byQid = new Map<string, WikidataBuilding>()
  for (const row of json?.results?.bindings ?? []) {
    const qid = qidFromUri(row.item?.value)
    const point = parseWktPoint(row.coord?.value)
    if (qid && point && !byQid.has(qid)) {
      byQid.set(qid, {
        qid,
        label: row.itemLabel?.value || qid,
        lat: point.lat,
        long: point.long,
        inceptionYear: wikidataYear(row.inception?.value),
        demolishedYear: wikidataYear(row.demolished?.value),
      })
    }
  }
  return [...byQid.values()]
}

async function querySparql(
  query: string,
  signal?: AbortSignal
): Promise<QueryResult<SparqlResult>> {
  const url = `${getEndpoint()}?query=${encodeURIComponent(query)}&format=json`
  try {
    const resp = await fetch(url, {
      headers: {Accept: 'application/sparql-results+json'},
      signal,
    })
    if (!resp.ok) {
      return {error: resp.statusText, status: resp.status}
    }
    return {data: await resp.json()}
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error
    return {error: (error as Error).message}
  }
}

export async function queryWikidataBuildings(
  bounds: Bounds,
  {lang, signal}: {lang?: string; signal?: AbortSignal} = {}
): Promise<QueryResult<WikidataBuilding[]>> {
  const res = await querySparql(buildBuildingsQuery(bounds, lang), signal)
  if ('error' in res) return res
  const buildings = parseBuildings(res.data)
  return {
    data: buildings,
    truncated: buildings.length >= WIKIDATA_BUILDINGS_LIMIT,
  }
}

function timeValueClause(subject: string, path: string, v: string): string {
  return `OPTIONAL { ${subject} ${path} [ wikibase:timeValue ?${v}Time ; wikibase:timePrecision ?${v}Prec ] . }`
}

function statementBranch(prop: string, v: string): string {
  return `?item p:${prop} ?${v}Stmt .
    ?${v}Stmt ps:${prop} ?${v} .
    ${timeValueClause(`?${v}Stmt`, 'pqv:P580', `${v}Start`)}
    ${timeValueClause(`?${v}Stmt`, 'pqv:P582', `${v}End`)}`
}

function timeVars(v: string): string {
  return `?${v}Time ?${v}Prec`
}

// Each property sits in its own UNION branch, so the row count is the sum
// of the value counts. The empty branch yields a row for items without any.
export function buildBuildingDetailQuery(qid: string, lang?: string): string {
  return `SELECT ?itemLabel ?itemDescription ?typeLabel ?image
  ${timeVars('inception')} ${timeVars('demolished')}
  ?occupant ?occupantLabel ${timeVars('occupantStart')} ${timeVars(
    'occupantEnd'
  )}
  ?owner ?ownerLabel ${timeVars('ownerStart')} ${timeVars('ownerEnd')}
  ?address ${timeVars('addressStart')} ${timeVars('addressEnd')}
  ?govId ?genWikiId
WHERE {
  VALUES ?item { wd:${qid} }
  {
  } UNION {
    ?item wdt:P31 ?type .
  } UNION {
    ?item wdt:P18 ?image .
  } UNION {
    ?item p:P571 ?inceptionStmt .
    ?inceptionStmt a wikibase:BestRank .
    ${timeValueClause('?inceptionStmt', 'psv:P571', 'inception')}
  } UNION {
    ?item p:P576 ?demolishedStmt .
    ?demolishedStmt a wikibase:BestRank .
    ${timeValueClause('?demolishedStmt', 'psv:P576', 'demolished')}
  } UNION {
    ${statementBranch('P466', 'occupant')}
  } UNION {
    ${statementBranch('P127', 'owner')}
  } UNION {
    ${statementBranch('P6375', 'address')}
  } UNION {
    ?item wdt:P2503 ?govId .
  } UNION {
    ?item wdt:P14871 ?genWikiId .
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "${wikidataLanguages(
    lang
  )}" . }
}`
}

function parseTime(row: SparqlRow, v: string): WikidataTime | null {
  const time = row[`${v}Time`]?.value
  if (!time) return null
  return {time, precision: parseInt(row[`${v}Prec`]?.value ?? '9', 10)}
}

function byStartYear(a: DatedEntry, b: DatedEntry): number {
  const yearA = wikidataYear(a.start?.time) ?? Infinity
  const yearB = wikidataYear(b.start?.time) ?? Infinity
  return yearA - yearB
}

function parseStatement(
  row: SparqlRow,
  v: string,
  value: string
): {key: string; entry: DatedEntry} {
  const start = parseTime(row, `${v}Start`)
  const end = parseTime(row, `${v}End`)
  return {
    key: `${value}|${start?.time}|${end?.time}`,
    entry: {label: row[`${v}Label`]?.value || value, start, end},
  }
}

function collect(map: Map<string, DatedItem>, row: SparqlRow, v: string): void {
  const value = row[v]?.value
  if (!value) return
  const {key, entry} = parseStatement(row, v, value)
  if (!map.has(key)) map.set(key, {...entry, qid: qidFromUri(value)})
}

export function parseBuildingDetail(
  json: SparqlResult
): WikidataBuildingDetail {
  const detail: WikidataBuildingDetail = {
    label: '',
    description: '',
    types: [],
    image: '',
    inception: null,
    demolished: null,
    occupants: [],
    owners: [],
    addresses: [],
    govId: '',
    genWikiId: '',
  }
  const types = new Set<string>()
  const occupants = new Map<string, DatedItem>()
  const owners = new Map<string, DatedItem>()
  const addresses = new Map<string, DatedEntry>()
  for (const row of json?.results?.bindings ?? []) {
    detail.label ||= row.itemLabel?.value ?? ''
    detail.description ||= row.itemDescription?.value ?? ''
    detail.image ||= row.image?.value ?? ''
    detail.inception ??= parseTime(row, 'inception')
    detail.demolished ??= parseTime(row, 'demolished')
    detail.govId ||= row.govId?.value ?? ''
    detail.genWikiId ||= row.genWikiId?.value ?? ''
    if (row.typeLabel?.value) types.add(row.typeLabel.value)
    collect(occupants, row, 'occupant')
    collect(owners, row, 'owner')
    const address = row.address?.value
    if (address) {
      const {key, entry} = parseStatement(row, 'address', address)
      if (!addresses.has(key)) addresses.set(key, entry)
    }
  }
  detail.types = [...types]
  detail.occupants = [...occupants.values()].sort(byStartYear)
  detail.owners = [...owners.values()].sort(byStartYear)
  detail.addresses = [...addresses.values()].sort(byStartYear)
  return detail
}

export async function queryWikidataBuilding(
  qid: string,
  {lang, signal}: {lang?: string; signal?: AbortSignal} = {}
): Promise<QueryResult<WikidataBuildingDetail>> {
  const res = await querySparql(buildBuildingDetailQuery(qid, lang), signal)
  if ('error' in res) return res
  return {data: parseBuildingDetail(res.data)}
}

// Formats a Wikidata time value according to its precision: 9 is a year,
// 10 a month and 11 a day. Coarser precisions are shown as a year.
export function formatWikidataTime(
  value: WikidataTime | null | undefined,
  lang = 'en'
): string {
  const year = wikidataYear(value?.time)
  if (!value || year === null) return ''
  const match = /^[+-]?\d+-(\d\d)-(\d\d)/.exec(value.time)
  if (value.precision < 10 || year < 1000 || !match) return `${year}`
  const date = new Date(
    Date.UTC(year, parseInt(match[1], 10) - 1, parseInt(match[2], 10))
  )
  const options: Intl.DateTimeFormatOptions =
    value.precision === 10
      ? {year: 'numeric', month: 'long', timeZone: 'UTC'}
      : {year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'}
  try {
    return new Intl.DateTimeFormat(lang.replaceAll('_', '-'), options).format(
      date
    )
  } catch (e) {
    return `${year}`
  }
}

export function formatWikidataTimeRange(
  start: WikidataTime | null,
  end: WikidataTime | null,
  lang = 'en'
): string {
  const from = formatWikidataTime(start, lang)
  const to = formatWikidataTime(end, lang)
  if (!from && !to) return ''
  return `${from}–${to}`
}

export function getDomusUrl(qid: string): string {
  return `https://domus.genealogy.net/map/?id=${qid}`
}

export function getWikidataUrl(qid: string): string {
  return `https://www.wikidata.org/wiki/${qid}`
}

// P18 values are Special:FilePath URLs, which accept a width parameter.
export function getCommonsThumbnailUrl(imageUrl: string, width = 400): string {
  if (!imageUrl) return ''
  return `${imageUrl.replace(/^http:/, 'https:')}?width=${width}`
}
