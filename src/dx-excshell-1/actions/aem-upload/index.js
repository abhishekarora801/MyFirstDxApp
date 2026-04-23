/*
 * AEM Assets upload action.
 *
 * Auth: JWT bearer token exchange using the Cloud Manager AEM Integration
 * (AEM-native technical account with metascope `ent_aem_cloud_api`).
 *
 * Flow:
 *   1. Sign a JWT with the integration's private key.
 *   2. POST /ims/exchange/jwt/ to receive an AEM-scoped access token.
 *   3. POST <folder>.initiateUpload.json   — get pre-signed upload URIs
 *   4. PUT  <uploadURI>                    — send binary to Azure Blob
 *   5. POST <folder>.completeUpload.json   — register the asset in AEM
 *
 * Why JWT instead of OAuth S2S (client_credentials)?
 *   AEMaaCS requires the `ent_aem_cloud_api` metascope, which is only
 *   granted by the Cloud Manager Integrations page (legacy JWT credentials).
 *   The newer OAuth S2S credentials require the AEM API to be added to the
 *   Developer Console project, which is a paid add-on.
 */

const crypto = require('crypto')
const fetch = require('node-fetch')
const { Core } = require('@adobe/aio-sdk')
const {
  errorResponse,
  stringParameters,
  checkMissingRequestInputs
} = require('../utils')

const DEFAULT_DAM_PATH = '/content/dam/firefly-generated'
const DEFAULT_IMS_HOST = 'ims-na1.adobelogin.com'
const DEFAULT_METASCOPE = 'ent_aem_cloud_api'

function base64url (input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function base64urlSignature (buf) {
  return buf.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function normalizePrivateKey (raw) {
  if (!raw) return raw
  // Accept either the raw PEM (with real newlines) or a base64-encoded PEM
  // (single-line, convenient for .env). We also support PEMs where newlines
  // have been replaced by the literal string "\n".
  const trimmed = String(raw).trim()
  if (trimmed.includes('BEGIN') && trimmed.includes('PRIVATE KEY')) {
    // PEM already; fix literal \n sequences if present
    return trimmed.replace(/\\n/g, '\n')
  }
  // Assume base64-encoded PEM
  try {
    const decoded = Buffer.from(trimmed, 'base64').toString('utf8')
    if (decoded.includes('BEGIN') && decoded.includes('PRIVATE KEY')) return decoded
  } catch (_) { /* fallthrough */ }
  throw new Error('AEM_PRIVATE_KEY is not a valid PEM or base64-encoded PEM')
}

function signJwt ({ clientId, technicalAccountId, orgId, imsHost, metascope, privateKey }) {
  const header = { alg: 'RS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: orgId,
    sub: technicalAccountId,
    aud: `https://${imsHost}/c/${clientId}`,
    exp: now + 5 * 60,
    [`https://${imsHost}/s/${metascope}`]: true
  }
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(signingInput)
  signer.end()
  const signature = base64urlSignature(signer.sign(privateKey))
  return `${signingInput}.${signature}`
}

async function exchangeJwtForToken ({ imsHost, clientId, clientSecret, jwtToken }) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    jwt_token: jwtToken
  })
  const res = await fetch(`https://${imsHost}/ims/exchange/jwt/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`IMS JWT exchange failed (${res.status}): ${text}`)
  }
  const data = await res.json()
  return data.access_token
}

async function getCsrfToken (aemHost, token, logger) {
  // AEMaaCS requires X-CSRF-Token on most mutating requests, even when
  // authenticated with a Bearer token. /libs/granite/csrf/token.json returns
  // a short-lived token bound to this session.
  const res = await fetch(`${aemHost}/libs/granite/csrf/token.json`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    logger.warn(`CSRF token fetch returned ${res.status}; continuing without CSRF. Body: ${text.slice(0, 200)}`)
    return null
  }
  const data = await res.json().catch(() => ({}))
  if (!data.token) {
    logger.warn('CSRF token response had no token field; continuing without CSRF')
    return null
  }
  logger.debug('Acquired CSRF token')
  return data.token
}

async function ensureFolder (aemHost, folderPath, token, csrfToken, logger) {
  const folderUrl = `${aemHost}${folderPath}.json`
  const headRes = await fetch(folderUrl, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  })
  if (headRes.ok) {
    logger.debug(`Folder exists: ${folderPath}`)
    return
  }
  if (headRes.status === 403) {
    // Now that JWT auth is correct, a 403 here means the tech account cannot
    // read /content/dam — almost certainly a missing Cloud Manager Integrations
    // permission assignment. Don't silently continue; fail loudly so the UI
    // shows the real problem.
    const text = await headRes.text().catch(() => '')
    throw new Error(`GET ${folderPath}.json returned 403 — the integration tech account lacks read permission on DAM. Assign this integration to an AEM product profile (e.g. "AEM Administrators") in Cloud Manager → Developer Console → Integrations → Permissions. Response: ${text.slice(0, 300)}`)
  }
  if (headRes.status !== 404) {
    const text = await headRes.text().catch(() => '')
    throw new Error(`Unexpected status ${headRes.status} checking folder ${folderPath}: ${text}`)
  }
  logger.info(`Creating DAM folder: ${folderPath}`)
  const parent = folderPath.substring(0, folderPath.lastIndexOf('/'))
  const name = folderPath.substring(folderPath.lastIndexOf('/') + 1)
  const body = new URLSearchParams({
    './jcr:primaryType': 'sling:OrderedFolder',
    './jcr:content/jcr:primaryType': 'nt:unstructured',
    './jcr:content/jcr:title': name
  })
  const createHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  }
  if (csrfToken) createHeaders['CSRF-Token'] = csrfToken
  const createRes = await fetch(`${aemHost}${parent}/*`, {
    method: 'POST',
    headers: createHeaders,
    body: body.toString() + `&:name=${encodeURIComponent(name)}`
  })
  if (!createRes.ok) {
    const text = await createRes.text().catch(() => '')
    throw new Error(`Failed to create folder ${folderPath}: ${createRes.status} ${text}`)
  }
}

async function main (params) {
  const logger = Core.Logger('aem-upload', { level: params.LOG_LEVEL || 'info' })

  try {
    logger.info('Calling aem-upload action')
    logger.debug(stringParameters(params))

    const missing = checkMissingRequestInputs(params, ['imageUrl', 'filename'])
    if (missing) return errorResponse(400, missing, logger)

    const aemHost = (params.AEM_HOST || '').replace(/\/$/, '')
    if (!aemHost) {
      return errorResponse(500, 'Missing AEM_HOST env input on action', logger)
    }

    const clientId = params.AEM_CLIENT_ID
    const clientSecret = params.AEM_CLIENT_SECRET
    const technicalAccountId = params.AEM_TECHNICAL_ACCOUNT_ID
    const orgId = params.AEM_ORG_ID
    const rawPrivateKey = params.AEM_PRIVATE_KEY
    const imsHost = params.AEM_IMS_HOST || DEFAULT_IMS_HOST
    const metascope = params.AEM_METASCOPE || DEFAULT_METASCOPE

    if (!clientId || !clientSecret || !technicalAccountId || !orgId || !rawPrivateKey) {
      return errorResponse(
        500,
        'Missing AEM JWT integration inputs (AEM_CLIENT_ID / AEM_CLIENT_SECRET / AEM_TECHNICAL_ACCOUNT_ID / AEM_ORG_ID / AEM_PRIVATE_KEY)',
        logger
      )
    }

    const privateKey = normalizePrivateKey(rawPrivateKey)

    logger.debug(`Signing JWT: iss=${orgId} sub=${technicalAccountId} aud=https://${imsHost}/c/${clientId} metascope=${metascope}`)
    const jwtToken = signJwt({ clientId, technicalAccountId, orgId, imsHost, metascope, privateKey })

    logger.debug('Exchanging JWT for IMS access token')
    const token = await exchangeJwtForToken({ imsHost, clientId, clientSecret, jwtToken })
    logger.info('Acquired AEM access token via JWT exchange')

    // Fetch CSRF token — AEMaaCS requires it on mutating requests
    const csrfToken = await getCsrfToken(aemHost, token, logger)

    const { imageUrl, filename } = params
    const damPath = (params.damPath || DEFAULT_DAM_PATH).replace(/\/$/, '')

    // 1. Fetch image bytes from Firefly
    logger.debug(`Downloading image from ${imageUrl}`)
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) {
      throw new Error(`Failed to download source image (${imgRes.status})`)
    }
    const buffer = await imgRes.buffer()
    const mimeType = imgRes.headers.get('content-type') || 'image/jpeg'
    logger.info(`Downloaded ${buffer.length} bytes, mime=${mimeType}`)

    // 2. Make sure the target DAM folder exists
    await ensureFolder(aemHost, damPath, token, csrfToken, logger)

    // 3. initiateUpload
    const initBody = new URLSearchParams({
      fileName: filename,
      fileSize: String(buffer.length)
    })
    const initHeaders = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    }
    if (csrfToken) initHeaders['CSRF-Token'] = csrfToken
    const initRes = await fetch(`${aemHost}${damPath}.initiateUpload.json`, {
      method: 'POST',
      headers: initHeaders,
      body: initBody.toString()
    })
    if (!initRes.ok) {
      const text = await initRes.text().catch(() => '')
      throw new Error(`initiateUpload failed (${initRes.status}): ${text}`)
    }
    const initData = await initRes.json()
    const fileInfo = (initData.files || [])[0]
    if (!fileInfo || !fileInfo.uploadURIs || !fileInfo.uploadURIs.length) {
      throw new Error('initiateUpload returned no uploadURIs')
    }
    logger.debug(`Got ${fileInfo.uploadURIs.length} upload URI(s)`)

    // 4. PUT binary to Azure Blob
    if (fileInfo.uploadURIs.length > 1) {
      logger.warn('Multi-part upload required by AEM but payload is small; attempting single-part')
    }
    const putRes = await fetch(fileInfo.uploadURIs[0], {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
        'x-ms-blob-type': 'BlockBlob'
      },
      body: buffer
    })
    if (!putRes.ok) {
      const text = await putRes.text().catch(() => '')
      throw new Error(`Binary upload failed (${putRes.status}): ${text}`)
    }

    // 5. completeUpload
    const completeUri = initData.completeURI || `${damPath}.completeUpload.json`
    const completeBody = new URLSearchParams({
      fileName: filename,
      mimeType,
      uploadToken: fileInfo.uploadToken
    })
    const completeHeaders = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    }
    if (csrfToken) completeHeaders['CSRF-Token'] = csrfToken
    const completeRes = await fetch(`${aemHost}${completeUri}`, {
      method: 'POST',
      headers: completeHeaders,
      body: completeBody.toString()
    })
    if (!completeRes.ok) {
      const text = await completeRes.text().catch(() => '')
      throw new Error(`completeUpload failed (${completeRes.status}): ${text}`)
    }

    const assetPath = `${damPath}/${filename}`
    const assetUrl = `${aemHost}/assetdetails.html${assetPath}`
    logger.info(`Upload complete: ${assetPath}`)

    return {
      statusCode: 200,
      body: { assetPath, assetUrl }
    }
  } catch (error) {
    logger.error(error)
    return errorResponse(500, error.message, logger)
  }
}

exports.main = main
