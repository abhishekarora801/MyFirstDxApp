/*
 * Firefly text-to-image action
 * Uses service-account client credentials (Stage) to get an IMS token,
 * then calls the Firefly v3 generate API.
 */

const fetch = require('node-fetch')
const { Core } = require('@adobe/aio-sdk')
const { errorResponse, stringParameters } = require('../utils')

async function getAccessToken (imsTokenUrl, clientId, clientSecret, scopes) {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: scopes
  })

  const res = await fetch(imsTokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`IMS token request failed (${res.status}): ${text}`)
  }

  const data = await res.json()
  return data.access_token
}

async function main (params) {
  const logger = Core.Logger('firefly-generate', { level: params.LOG_LEVEL || 'info' })

  try {
    logger.info('Calling firefly-generate action')
    logger.debug(stringParameters(params))

    const { prompt, contentClass, size, stylePresets } = params

    if (!prompt) {
      return errorResponse(400, 'Missing required parameter: prompt', logger)
    }

    const clientId = params.FIREFLY_CLIENT_ID
    const clientSecret = params.FIREFLY_CLIENT_SECRET
    const scopes = params.FIREFLY_SCOPES || 'openid,AdobeID,firefly_api,ff_apis'
    const imsTokenUrl = params.IMS_TOKEN_URL || 'https://ims-na1-stg1.adobelogin.com/ims/token/v3'
    const fireflyApiUrl = params.FIREFLY_API_URL || 'https://firefly-api-enterprise-stage.adobe.io/'

    if (!clientId || !clientSecret) {
      return errorResponse(500, 'Missing Firefly credentials (FIREFLY_CLIENT_ID / FIREFLY_CLIENT_SECRET)', logger)
    }

    const accessToken = await getAccessToken(imsTokenUrl, clientId, clientSecret, scopes)

    const requestBody = { prompt }
    if (contentClass === 'photo' || contentClass === 'art') {
      requestBody.contentClass = contentClass
    }
    if (size && Number.isInteger(size.width) && Number.isInteger(size.height)) {
      requestBody.size = { width: size.width, height: size.height }
    }
    if (Array.isArray(stylePresets) && stylePresets.length > 0) {
      requestBody.style = { presets: stylePresets.filter(s => typeof s === 'string' && s.length) }
    }

    logger.debug('Firefly request body:', JSON.stringify(requestBody))

    const fireflyRes = await fetch(fireflyApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-api-key': clientId,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!fireflyRes.ok) {
      const text = await fireflyRes.text()
      throw new Error(`Firefly API failed (${fireflyRes.status}): ${text}`)
    }

    const result = await fireflyRes.json()
    logger.info('Firefly response received, images:', result.outputs?.length)

    return {
      statusCode: 200,
      body: {
        images: (result.outputs || []).map(o => ({
          seed: o.seed,
          url: o.image?.url
        }))
      }
    }
  } catch (error) {
    logger.error(error)
    return errorResponse(500, error.message, logger)
  }
}

exports.main = main
