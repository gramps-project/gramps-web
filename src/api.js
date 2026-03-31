// eslint-disable-next-line camelcase
import jwt_decode from 'jwt-decode'

import {fireEvent, normalizeRect} from './util.js'

export const __APIHOST__ = 'http://localhost:5555'

// Access token expiration time (15 minutes in milliseconds)
export const ACCESS_TOKEN_EXPIRY_MS = 15 * 60 * 1000

export function doLogout() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('access_token_expires')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('id_token')
  window.dispatchEvent(
    new CustomEvent('user:loggedout', {bubbles: true, composed: true})
  )
}

export function storeAuthToken(authToken, expires) {
  localStorage.setItem('access_token', authToken)
  localStorage.setItem('access_token_expires', expires)
}

export function storeRefreshToken(refreshToken) {
  localStorage.setItem('refresh_token', refreshToken)
}

export function getTreeId() {
  const accessToken = localStorage.getItem('access_token')
  let claims = {}
  try {
    claims = jwt_decode(accessToken) || {}
  } catch {
    claims = {}
  }
  return claims.tree
}

export function getTreeFromToken(token) {
  const claims = jwt_decode(token) || {}
  return claims.tree
}

export function getPermissions() {
  const accessToken = localStorage.getItem('access_token')
  if (!accessToken || accessToken === '1') {
    return null
  }
  try {
    const claims = jwt_decode(accessToken) || {}
    return claims.permissions || {}
  } catch (e) {
    return {}
  }
}

// grampsjs_settings are tree-independent settings
// grampsjs_settings_tree are tree-dependendent settings
// this function returns all of them without distinguishing
export function getSettings() {
  try {
    const settingString = localStorage.getItem('grampsjs_settings')
    const settings = JSON.parse(settingString) || {}
    const settingStringTree = localStorage.getItem('grampsjs_settings_tree')
    const treeId = getTreeId() || 'unknown'
    const settingsTree = JSON.parse(settingStringTree)?.[treeId] || {}
    return {...settings, ...settingsTree}
  } catch (e) {
    return {}
  }
}

// update the settings; if `tree` is true, update the tree-dependent settings
// otherwise the tree-independent ones
export function updateSettings(settings, tree = false) {
  const key = tree ? 'grampsjs_settings_tree' : 'grampsjs_settings'
  const settingString = localStorage.getItem(key)
  const parsedSettings = JSON.parse(settingString) || {}
  const treeId = getTreeId() || 'unknown'
  const existingSettings = tree ? parsedSettings?.[treeId] : parsedSettings
  const finalSettings = {...existingSettings, ...settings}
  const data = tree ? {[treeId]: finalSettings} : finalSettings
  localStorage.setItem(key, JSON.stringify(data))
  fireEvent(window, 'settings:changed')
}

export function getRecentObjects() {
  try {
    const string = localStorage.getItem('recentObjects')
    const data = JSON.parse(string)
    if (Array.isArray(data)) {
      return data
    }
    const tree = getTreeId()
    if (tree) {
      return data[tree]
    }
    return []
  } catch (e) {
    return []
  }
}

export function setRecentObjects(data) {
  const tree = getTreeId()
  const objectData = tree ? {[tree]: data} : data
  const stringData = JSON.stringify(objectData)
  localStorage.setItem('recentObjects', stringData)
}

export function getChatHistory() {
  try {
    const string = localStorage.getItem('chatMessages')
    const data = JSON.parse(string)
    const tree = getTreeId()
    if (tree) {
      return data[tree]
    }
    return []
  } catch (e) {
    return []
  }
}

export function setChatHistory(data) {
  const tree = getTreeId()
  if (!tree) {
    return
  }
  const stringDataAll = localStorage.getItem('chatMessages')
  const objectDataAll = JSON.parse(stringDataAll)
  const objectDataNew = {[tree]: data}
  const objectData = {...objectDataAll, ...objectDataNew}
  const stringData = JSON.stringify(objectData)
  localStorage.setItem('chatMessages', stringData)
}

// Editor draft management
const DRAFT_EXPIRY_DAYS = 7

export function saveDraft(key, data) {
  const tree = getTreeId()
  if (!tree || !key) {
    return
  }
  try {
    const stringDataAll = localStorage.getItem('grampsjs_editor_drafts')
    const objectDataAll = stringDataAll ? JSON.parse(stringDataAll) : {}
    const treeDrafts = objectDataAll[tree] || {}

    treeDrafts[key] = {
      data,
      timestamp: Date.now(),
    }

    objectDataAll[tree] = treeDrafts
    localStorage.setItem(
      'grampsjs_editor_drafts',
      JSON.stringify(objectDataAll)
    )
  } catch (e) {
    // Silently fail if localStorage is full or unavailable
    console.warn('Failed to save draft:', e)
  }
}

export function getDraft(key) {
  const tree = getTreeId()
  if (!tree || !key) {
    return null
  }
  try {
    const stringDataAll = localStorage.getItem('grampsjs_editor_drafts')
    if (!stringDataAll) {
      return null
    }
    const objectDataAll = JSON.parse(stringDataAll)
    const treeDrafts = objectDataAll[tree] || {}
    const draft = treeDrafts[key]

    if (!draft) {
      return null
    }

    // Check if draft is expired
    const ageInDays = (Date.now() - draft.timestamp) / (1000 * 60 * 60 * 24)
    if (ageInDays > DRAFT_EXPIRY_DAYS) {
      // Clean up expired draft
      delete treeDrafts[key]
      objectDataAll[tree] = treeDrafts
      localStorage.setItem(
        'grampsjs_editor_drafts',
        JSON.stringify(objectDataAll)
      )
      return null
    }

    return draft
  } catch (e) {
    return null
  }
}

export function clearDraft(key) {
  const tree = getTreeId()
  if (!tree || !key) {
    return
  }
  try {
    const stringDataAll = localStorage.getItem('grampsjs_editor_drafts')
    if (!stringDataAll) {
      return
    }
    const objectDataAll = JSON.parse(stringDataAll)
    const treeDrafts = objectDataAll[tree] || {}

    if (treeDrafts[key]) {
      delete treeDrafts[key]
      objectDataAll[tree] = treeDrafts
      localStorage.setItem(
        'grampsjs_editor_drafts',
        JSON.stringify(objectDataAll)
      )
    }
  } catch (e) {
    // Silently fail
  }
}

export function clearDraftsWithPrefix(prefix) {
  const tree = getTreeId()
  if (!tree || !prefix) {
    return
  }
  try {
    const stringDataAll = localStorage.getItem('grampsjs_editor_drafts')
    if (!stringDataAll) {
      return
    }
    const objectDataAll = JSON.parse(stringDataAll)
    const treeDrafts = objectDataAll[tree] || {}

    // Delete all keys that start with the prefix
    const keysToDelete = []
    Object.keys(treeDrafts).forEach(key => {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key)
      }
    })

    if (keysToDelete.length > 0) {
      keysToDelete.forEach(key => {
        delete treeDrafts[key]
      })
      objectDataAll[tree] = treeDrafts
      localStorage.setItem(
        'grampsjs_editor_drafts',
        JSON.stringify(objectDataAll)
      )
    }
  } catch (e) {
    // Silently fail
  }
}

export function cleanOldDrafts() {
  try {
    const stringDataAll = localStorage.getItem('grampsjs_editor_drafts')
    if (!stringDataAll) {
      return
    }
    const objectDataAll = JSON.parse(stringDataAll)
    const cutoffTime = Date.now() - DRAFT_EXPIRY_DAYS * 24 * 60 * 60 * 1000

    // Clean all trees
    Object.keys(objectDataAll).forEach(treeId => {
      const treeDrafts = objectDataAll[treeId] || {}
      Object.keys(treeDrafts).forEach(key => {
        if (treeDrafts[key].timestamp < cutoffTime) {
          delete treeDrafts[key]
        }
      })
      objectDataAll[treeId] = treeDrafts
    })

    localStorage.setItem(
      'grampsjs_editor_drafts',
      JSON.stringify(objectDataAll)
    )
  } catch (e) {
    // Silently fail
  }
}

export async function apiResetPassword(username) {
  try {
    const resp = await fetch(
      `${__APIHOST__}/api/users/${username}/password/reset/trigger/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
    let resJson
    try {
      resJson = await resp.json()
    } catch (error) {
      resJson = {}
    }
    if (resp.status === 404) {
      throw new Error('User not found or user has no e-mail address.')
    }
    if (resp.status === 500) {
      throw new Error(
        'The server encountered an error while trying to send the e-mail.'
      )
    }
    if (resp.status !== 201 && resp.status !== 202) {
      throw new Error(
        resJson?.error?.message || resp.statusText || `Error ${resp.status}`
      )
    }
    return {}
  } catch (error) {
    return {error: error.message}
  }
}

export async function apiGetOIDCConfig() {
  try {
    const resp = await fetch(`${__APIHOST__}/api/oidc/config/`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })
    if (!resp.ok) {
      let resJson
      try {
        resJson = await resp.json()
      } catch {
        resJson = {}
      }
      throw new Error(
        resJson?.error?.message || resp.statusText || `Error ${resp.status}`
      )
    }
    return await resp.json()
  } catch (error) {
    return {error: error.message}
  }
}

export async function apiOIDCLogin(providerId) {
  try {
    if (!providerId) {
      throw new Error('Provider ID is required')
    }
    window.location.href = `${__APIHOST__}/api/oidc/login/?provider=${encodeURIComponent(
      providerId
    )}`
    return {success: true}
  } catch (error) {
    return {error: error.message}
  }
}

export async function apiGetOIDCLogoutUrl(
  providerId,
  idToken,
  postLogoutRedirectUri
) {
  try {
    if (!providerId) {
      throw new Error('Provider ID is required')
    }
    const params = new URLSearchParams({provider: providerId})
    if (idToken) {
      params.append('id_token', idToken)
    }
    if (postLogoutRedirectUri) {
      params.append('post_logout_redirect_uri', postLogoutRedirectUri)
    }
    const resp = await fetch(
      `${__APIHOST__}/api/oidc/logout/?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      }
    )
    let resJson
    try {
      resJson = await resp.json()
    } catch (error) {
      resJson = {}
    }
    if (!resp.ok) {
      throw new Error(
        resJson?.error?.message || resp.statusText || `Error ${resp.status}`
      )
    }
    return resJson
  } catch (error) {
    return {error: error.message, logout_url: null}
  }
}

export async function apiRegisterUser(
  username,
  password,
  email,
  fullname,
  tree
) {
  try {
    let payload = {password, email, full_name: fullname}
    payload = tree ? {...payload, tree} : payload
    const resp = await fetch(`${__APIHOST__}/api/users/${username}/register/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    let resJson
    try {
      resJson = await resp.json()
    } catch (error) {
      resJson = {}
    }
    if (resp.status === 409) {
      throw new Error('Username or e-mail already taken.')
    }
    if (resp.status !== 201) {
      throw new Error(
        resJson?.error?.message || resp.statusText || `Error ${resp.status}`
      )
    }
    return {}
  } catch (error) {
    return {error: error.message}
  }
}

export async function apiGetTokens(username, password) {
  try {
    const resp = await fetch(`${__APIHOST__}/api/token/`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({username, password}),
    })
    if (resp.status === 401 || resp.status === 403) {
      throw new Error('Wrong username or password')
    } else if (resp.status !== 200) {
      let resJson
      try {
        resJson = await resp.json()
      } catch {
        resJson = {}
      }
      throw new Error(
        resJson?.error?.message || resp.statusText || `Error ${resp.status}`
      )
    }
    const data = await resp.json()
    if (data.access_token === undefined) {
      return {error: 'Access token missing in response'}
    }
    if (data.refresh_token === undefined) {
      return {error: 'Refresh token missing in response'}
    }
    const expires = Date.now() + ACCESS_TOKEN_EXPIRY_MS
    storeAuthToken(data.access_token, expires)
    storeRefreshToken(data.refresh_token)
    return {}
  } catch (error) {
    return {error: error.message}
  }
}

export function getExporterUrl(id, options) {
  const jwt = localStorage.getItem('access_token')
  const queryParam = new URLSearchParams(options).toString()
  return `${__APIHOST__}/api/exporters/${id}/file?jwt=${jwt}&${queryParam}`
}

export function getExporterDownloadUrl(url) {
  const jwt = localStorage.getItem('access_token')
  return `${__APIHOST__}${url}?jwt=${jwt}`
}

export function getReportUrl(id, options) {
  const jwt = localStorage.getItem('access_token')
  const queryParam = `options=${encodeURIComponent(JSON.stringify(options))}`
  if (jwt === null) {
    return `${__APIHOST__}/api/reports/${id}/file?${queryParam}`
  }
  return `${__APIHOST__}/api/reports/${id}/file?jwt=${jwt}&${queryParam}`
}

export function getMediaUrl(handle, download = false) {
  const jwt = localStorage.getItem('access_token')
  if (jwt === null) {
    const url = `${__APIHOST__}/api/media/${handle}/file`
    return download ? `${url}?download=1` : url
  }
  const url = `${__APIHOST__}/api/media/${handle}/file?jwt=${jwt}`
  return download ? `${url}&download=1` : url
}

function _isNormalizedRect(rect) {
  if (!Array.isArray(rect) || rect.length !== 4) {
    return false
  }
  const [x1, y1, x2, y2] = rect
  const values = [x1, y1, x2, y2]
  if (values.some(value => !Number.isInteger(value))) {
    return false
  }
  if (values.some(value => value < 0 || value > 100)) {
    return false
  }
  return x1 < x2 && y1 < y2
}

function _getRectForUrl(rect) {
  return _isNormalizedRect(rect) ? rect : normalizeRect(rect)
}

export function getMediaUrlCropped(handle, rect) {
  const normalizedRect = _getRectForUrl(rect)
  if (!normalizedRect) {
    return getMediaUrl(handle)
  }
  const jwt = localStorage.getItem('access_token')
  const [x1, y1, x2, y2] = normalizedRect
  if (jwt === null) {
    return `${__APIHOST__}/api/media/${handle}/cropped/${x1}/${y1}/${x2}/${y2}`
  }
  return `${__APIHOST__}/api/media/${handle}/cropped/${x1}/${y1}/${x2}/${y2}?jwt=${jwt}`
}

function _checksumParam(checksum) {
  return checksum ? `&checksum=${checksum}` : ''
}

export function getThumbnailUrl(handle, size, square = false, checksum = null) {
  const jwt = localStorage.getItem('access_token')
  const cs = _checksumParam(checksum)
  if (jwt === null) {
    return `${__APIHOST__}/api/media/${handle}/thumbnail/${size}?square=${square}${cs}`
  }
  return `${__APIHOST__}/api/media/${handle}/thumbnail/${size}?jwt=${jwt}&square=${square}${cs}`
}

export function getThumbnailUrlCropped(
  handle,
  rect,
  size,
  square = false,
  checksum = null
) {
  const normalizedRect = _getRectForUrl(rect)
  if (!normalizedRect) {
    return getThumbnailUrl(handle, size, square, checksum)
  }
  const jwt = localStorage.getItem('access_token')
  const cs = _checksumParam(checksum)
  const [x1, y1, x2, y2] = normalizedRect
  if (jwt === null) {
    return `${__APIHOST__}/api/media/${handle}/cropped/${x1}/${y1}/${x2}/${y2}/thumbnail/${size}?square=${square}${cs}`
  }
  return `${__APIHOST__}/api/media/${handle}/cropped/${x1}/${y1}/${x2}/${y2}/thumbnail/${size}?jwt=${jwt}&square=${square}${cs}`
}

export async function queryNominatim(q) {
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=jsonv2`
  try {
    const resp = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    if (resp.status !== 200) {
      throw new Error(`Error ${resp.statusText}`)
    }
    return {data: await resp.json()}
  } catch (error) {
    return {error: error.message}
  }
}

export function getTreeBookmarks() {
  try {
    const string = localStorage.getItem('bookmarks')
    const data = JSON.parse(string)
    const tree = getTreeId()
    if (tree) {
      return data[tree]
    }
    return {}
  } catch (e) {
    return {}
  }
}

export function getAllBookmarks() {
  try {
    const string = localStorage.getItem('bookmarks')
    const data = JSON.parse(string) ?? {}
    return data
  } catch (e) {
    return {}
  }
}

export function hasBookmark(endpoint, handle) {
  const data = getTreeBookmarks()
  return !!data?.[endpoint]?.includes(handle)
}

export function addBookmark(endpoint, handle) {
  const tree = getTreeId()
  const data = getAllBookmarks()
  if (!Object.hasOwn(data, tree)) {
    data[tree] = {[endpoint]: [handle]}
  } else if (!Object.hasOwn(data[tree], endpoint)) {
    data[tree] = {...data[tree], [endpoint]: [handle]}
  } else {
    data[tree][endpoint] = [
      ...data[tree][endpoint].filter(h => h !== handle),
      handle,
    ]
  }
  const stringData = JSON.stringify(data)
  localStorage.setItem('bookmarks', stringData)
}

export function deleteBookmark(endpoint, handle) {
  const tree = getTreeId()
  const data = getAllBookmarks()
  if (data?.[tree]?.[endpoint]) {
    data[tree][endpoint] = [...data[tree][endpoint].filter(h => h !== handle)]
    const stringData = JSON.stringify(data)
    localStorage.setItem('bookmarks', stringData)
  }
}

export function getTaskIds() {
  try {
    const string = localStorage.getItem('tasks')
    const data = JSON.parse(string) ?? {}
    const tree = getTreeId()
    if (tree) {
      return data[tree]
    }
    return {}
  } catch (e) {
    return {}
  }
}

export function getAllTaskIds() {
  try {
    const string = localStorage.getItem('tasks')
    const data = JSON.parse(string) ?? {}
    return data
  } catch (e) {
    return {}
  }
}

export function addTaskId(taskName, taskId) {
  const tree = getTreeId()
  const data = getAllTaskIds()
  if (!Object.hasOwn(data, tree)) {
    data[tree] = {[taskName]: taskId}
  } else {
    data[tree][taskName] = taskId
  }
  const stringData = JSON.stringify(data)
  localStorage.setItem('tasks', stringData)
}

export function deleteTaskId(taskName, taskId) {
  const tree = getTreeId()
  const data = getAllTaskIds()
  if (data?.[tree]?.[taskName] === taskId) {
    delete data[tree][taskName]
    const stringData = JSON.stringify(data)
    localStorage.setItem('tasks', stringData)
  }
}

export class Auth {
  constructor() {
    this._refreshingTokens = null
  }

  // eslint-disable-next-line class-methods-use-this
  get accessToken() {
    return localStorage.getItem('access_token')
  }

  // eslint-disable-next-line class-methods-use-this
  get refreshToken() {
    return localStorage.getItem('refresh_token')
  }

  async getValidAccessToken(force = false) {
    if (force || this._shouldRefresh()) {
      if (this._refreshingTokens) {
        // If already refreshing, wait for that to finish
        await this._refreshingTokens
      } else {
        // Start the refresh process and store the promise
        this._refreshingTokens = this.refreshAuthTokens().finally(() => {
          this._refreshingTokens = null
        })
        await this._refreshingTokens
      }
    }
    return this.accessToken
  }

  _shouldRefresh() {
    const {claims} = this
    if (!claims.exp) return true
    const tolerance = 60 * 1000 // 1 minute tolerance
    return claims.exp * 1000 < Date.now() + tolerance
  }

  get claims() {
    const token = this.accessToken
    if (!token) return {}
    return jwt_decode(token)
  }

  isTokenFresh() {
    return !!this.claims.fresh
  }

  async signout() {
    const oidcProvider = this.claims.oidc_provider
    const idToken = localStorage.getItem('id_token')

    localStorage.removeItem('access_token')
    localStorage.removeItem('access_token_expires')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('id_token')

    fireEvent(window, 'user:loggedout')

    if (oidcProvider) {
      try {
        const postLogoutRedirectUri = window.location.origin
        const result = await apiGetOIDCLogoutUrl(
          oidcProvider,
          idToken,
          postLogoutRedirectUri
        )

        if (result.logout_url) {
          window.location.href = result.logout_url
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Failed to get OIDC logout URL:', error)
      }
    }
  }

  async refreshAuthTokens(attempts = 3) {
    if (this.refreshToken === null) {
      throw new Error('No refresh token found')
    }
    const resp = await fetch(`${__APIHOST__}/api/token/refresh/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.refreshToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
    if (resp.status === 403 || resp.status === 422) {
      doLogout()
      throw new Error('Failed refreshing token')
    }
    // handle 429 too-many-attempts
    if (resp.status === 429 && attempts > 0) {
      // retry after 1s
      const jitter = Math.floor(Math.random() * 1000)
      await new Promise(resolve => setTimeout(resolve, 1000 + jitter))
      return this.refreshAuthTokens(attempts - 1)
    }
    const data = await resp.json()
    if (data.access_token === undefined) {
      throw new Error('Access token missing in response')
    }
    localStorage.setItem('access_token', data.access_token)
    return {}
  }
}

export async function apiGet(auth, endpoint) {
  try {
    const headers = {}
    try {
      const accessToken = await auth.getValidAccessToken()
      headers.Authorization = `Bearer ${accessToken}`
      // eslint-disable-next-line no-empty
    } catch {}
    const resp = await fetch(`${__APIHOST__}${endpoint}`, {
      method: 'GET',
      headers,
    })
    let resJson
    try {
      resJson = await resp.json()
    } catch (error) {
      resJson = {}
    }
    if (resp.status === 403) {
      throw new Error('Authorization error')
    }
    if (resp.status !== 200) {
      throw new Error(
        resJson?.error?.message || resp.statusText || `Error ${resp.status}`
      )
    }
    return {
      data: resJson,
      total_count: resp.headers.get('X-Total-Count'),
      etag: resp.headers.get('ETag'),
    }
  } catch (error) {
    if (error instanceof TypeError) {
      return {error: 'Network error'}
    }
    return {error: error.message}
  }
}

export async function apiPutPostDelete(
  auth,
  method,
  endpoint,
  payload,
  {isJson = true, dbChanged = true, requireFresh = false, etag} = {}
) {
  try {
    let headers = {}
    try {
      const accessToken = await auth.getValidAccessToken()
      headers = {
        ...headers,
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      }
      // eslint-disable-next-line no-empty
    } catch {}
    if (isJson) {
      headers['Content-Type'] = 'application/json'
    }
    if (method === 'PUT' && etag) {
      headers['If-Match'] = etag
    }
    const resp = await fetch(`${__APIHOST__}${endpoint}`, {
      method,
      headers,
      body: isJson ? JSON.stringify(payload) : payload,
    })
    let resJson
    try {
      resJson = await resp.json()
    } catch (error) {
      resJson = {}
    }
    if (resp.status === 401) {
      if (requireFresh) {
        throw new Error(resJson.message)
      }
    }
    if (resp.status === 403) {
      throw new Error('Not authorized')
    }
    if (resp.status === 412) {
      throw new Error(
        'Object has been modified by another user. Please reload and try again.'
      )
    }
    if (resp.status !== 201 && resp.status !== 200 && resp.status !== 202) {
      throw new Error(
        resJson?.error?.message || resp.statusText || `Error ${resp.status}`
      )
    }
    if (dbChanged) {
      fireEvent(window, 'db:changed')
    }
    if (resp.status === 202 && 'task' in resJson) {
      return resJson
    }
    return {
      data: resJson,
      total_count: resp.headers.get('X-Total-Count'),
      etag: resp.headers.get('ETag'),
    }
  } catch (error) {
    return {error: error.message}
  }
}

async function fetchStatus(auth, taskId) {
  const res = await apiGet(auth, `/api/tasks/${taskId}`)
  return res.data
}

export async function updateTaskStatus(
  auth,
  taskId,
  statusCallback,
  pollInterval = 1000,
  maxPolls = Infinity,
  shouldContinue = () => true
) {
  const doneStates = ['FAILURE', 'REVOKED', 'SUCCESS']
  let i = 0
  let status = {}
  // Let callers stop polling when the owning UI task changes or disconnects.
  while (
    shouldContinue() &&
    !doneStates.includes(status.state) &&
    i < maxPolls
  ) {
    // eslint-disable-next-line no-await-in-loop
    status = await fetchStatus(auth, taskId)
    if (!shouldContinue()) {
      break
    }
    statusCallback(status)
    if (!shouldContinue() || doneStates.includes(status.state)) {
      break
    }
    // wait for 1s
    // eslint-disable-next-line no-await-in-loop
    await new Promise(resolve => setTimeout(resolve, pollInterval))
    i += 1
  }
}
