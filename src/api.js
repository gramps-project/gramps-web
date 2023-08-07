// eslint-disable-next-line camelcase
import jwt_decode from 'jwt-decode'

export const __APIHOST__ = 'http://localhost:5555'

export function doLogout() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('access_token_expires')
  localStorage.removeItem('refresh_token')
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

export function getTree() {
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
    const treeId = getTree() || 'unknown'
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
  const treeId = getTree() || 'unknown'
  const existingSettings = tree ? parsedSettings?.[treeId] : parsedSettings
  const finalSettings = {...existingSettings, ...settings}
  const data = tree ? {[treeId]: finalSettings} : finalSettings
  localStorage.setItem(key, JSON.stringify(data))
  window.dispatchEvent(
    new CustomEvent('settings:changed', {bubbles: true, composed: true})
  )
}

export function getRecentObjects() {
  try {
    const string = localStorage.getItem('recentObjects')
    const data = JSON.parse(string)
    if (Array.isArray(data)) {
      return data
    }
    const tree = getTree()
    if (tree) {
      return data[tree]
    }
    return []
  } catch (e) {
    return []
  }
}

export function setRecentObjects(data) {
  const tree = getTree()
  const objectData = tree ? {[tree]: data} : data
  const stringData = JSON.stringify(objectData)
  localStorage.setItem('recentObjects', stringData)
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
    if (resp.status === 404) {
      throw new Error('User not found.')
    }
    if (resp.status === 500) {
      throw new Error(
        'The server encountered an error while trying to send the e-mail.'
      )
    }
    if (resp.status !== 201 && resp.status !== 202) {
      throw new Error(`Error ${resp.status}`)
    }
    return {}
  } catch (error) {
    return {error: error.message}
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
      throw new Error(resJson?.error?.message || `Error ${resp.status}`)
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
    }
    if (resp.status !== 200) {
      throw new Error(`Error ${resp.status}`)
    }
    const data = await resp.json()
    if (data.access_token === undefined) {
      return {error: 'Access token missing in response'}
    }
    if (data.refresh_token === undefined) {
      return {error: 'Refresh token missing in response'}
    }
    const expires = Date.now() + 15 * 60 * 1000
    storeAuthToken(data.access_token, expires)
    storeRefreshToken(data.refresh_token)
    return {}
  } catch (error) {
    return {error: error.message}
  }
}

export async function apiRefreshAuthToken(attempts = 3) {
  const refreshToken = localStorage.getItem('refresh_token')
  if (refreshToken === null) {
    return {error: 'No refresh token found!'}
  }
  try {
    const resp = await fetch(`${__APIHOST__}/api/token/refresh/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${refreshToken}`,
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
      await new Promise(resolve => setTimeout(resolve, 1000))
      return apiRefreshAuthToken(attempts - 1)
    }
    const data = await resp.json()
    if (data.access_token === undefined) {
      throw new Error('Access token missing in response')
    }
    const expires = Date.now() + 15 * 60 * 1000
    storeAuthToken(data.access_token, expires)
    return {}
  } catch (error) {
    return {error: error.message}
  }
}

export async function apiGet(endpoint, isJson = true) {
  const accessToken = localStorage.getItem('access_token')
  let headers = {}
  if (accessToken !== null) {
    headers = {
      Authorization: `Bearer ${accessToken}`,
    }
  }
  try {
    const resp = await fetch(`${__APIHOST__}${endpoint}`, {
      method: 'GET',
      headers,
    })
    if (resp.status === 401) {
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken === null) {
        throw new Error('Missing refresh token')
      }
      const refreshResp = await apiRefreshAuthToken()
      if ('error' in refreshResp) {
        throw new Error(refreshResp.error)
      } else {
        return apiGet(endpoint, isJson)
      }
    }
    if (resp.status === 403) {
      throw new Error('Authorization error')
    }
    if (resp.status !== 200) {
      throw new Error(`Error ${resp.status}`)
    }
    if (isJson) {
      return {
        data: await resp.json(),
        total_count: resp.headers.get('X-Total-Count'),
        etag: resp.headers.get('ETag'),
      }
    }
    return {
      data: await resp.text(),
    }
  } catch (error) {
    if (error instanceof TypeError) {
      return {error: 'Network error'}
    }
    return {error: error.message}
  }
}

async function apiPutPost(
  method,
  endpoint,
  payload,
  isJson = true,
  dbChanged = true
) {
  const accessToken = localStorage.getItem('access_token')
  const headers = {Accept: 'application/json'}
  if (accessToken !== null) {
    headers.Authorization = `Bearer ${accessToken}`
  }
  if (isJson) {
    headers['Content-Type'] = 'application/json'
  }
  try {
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
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken === null) {
        throw new Error('Missing refresh token')
      }
      const refreshResp = await apiRefreshAuthToken()
      if ('error' in refreshResp) {
        throw new Error(refreshResp.error)
      } else {
        return apiPutPost(method, endpoint, payload, isJson, dbChanged)
      }
    }
    if (resp.status === 403) {
      throw new Error('Not authorized')
    }
    if (resp.status !== 201 && resp.status !== 200 && resp.status !== 202) {
      throw new Error(resJson?.error?.message || `Error ${resp.status}`)
    }
    if (dbChanged) {
      window.dispatchEvent(
        new CustomEvent('db:changed', {bubbles: true, composed: true})
      )
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

export async function apiPut(
  endpoint,
  payload,
  isJson = true,
  dbChanged = true
) {
  return apiPutPost('PUT', endpoint, payload, isJson, dbChanged)
}

export async function apiPost(
  endpoint,
  payload,
  isJson = true,
  dbChanged = true
) {
  return apiPutPost('POST', endpoint, payload, isJson, dbChanged)
}

export async function apiDelete(endpoint, dbChanged = true) {
  return apiPutPost('DELETE', endpoint, null, false, dbChanged)
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

export function getMediaUrlCropped(handle, rect) {
  const jwt = localStorage.getItem('access_token')
  const [x1, y1, x2, y2] = rect
  if (jwt === null) {
    return `${__APIHOST__}/api/media/${handle}/cropped/${x1}/${y1}/${x2}/${y2}`
  }
  return `${__APIHOST__}/api/media/${handle}/cropped/${x1}/${y1}/${x2}/${y2}?jwt=${jwt}`
}

export function getThumbnailUrl(handle, size, square = false) {
  const jwt = localStorage.getItem('access_token')
  if (jwt === null) {
    return `${__APIHOST__}/api/media/${handle}/thumbnail/${size}?square=${square}`
  }
  return `${__APIHOST__}/api/media/${handle}/thumbnail/${size}?jwt=${jwt}&square=${square}`
}

export function getThumbnailUrlCropped(handle, rect, size, square = false) {
  const jwt = localStorage.getItem('access_token')
  const [x1, y1, x2, y2] = rect
  if (jwt === null) {
    return `${__APIHOST__}/api/media/${handle}/cropped/${x1}/${y1}/${x2}/${y2}/thumbnail/${size}?square=${square}`
  }
  return `${__APIHOST__}/api/media/${handle}/cropped/${x1}/${y1}/${x2}/${y2}/thumbnail/${size}?jwt=${jwt}&square=${square}`
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

async function fetchStatus(taskId) {
  const res = await apiGet(`/api/tasks/${taskId}`)
  return res.data
}

export async function updateTaskStatus(
  taskId,
  statusCallback,
  pollInterval = 1000,
  maxPolls = Infinity
) {
  const doneStates = ['FAILURE', 'REVOKED', 'SUCCESS']
  let i = 0
  let status = {}
  while (!doneStates.includes(status.state) && i < maxPolls) {
    // eslint-disable-next-line no-await-in-loop
    status = await fetchStatus(taskId)
    statusCallback(status)
    // wait for 1s
    // eslint-disable-next-line no-await-in-loop
    await new Promise(resolve => setTimeout(resolve, pollInterval))
    i += 1
  }
}
