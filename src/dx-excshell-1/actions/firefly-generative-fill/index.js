const fetch = require('node-fetch')
const { Core } = require('@adobe/aio-sdk')
const { errorResponse, stringParameters } = require('../utils')

const UPLOAD_URL = 'https://firefly-api-enterprise-stage.adobe.io/v2/storage/image'
const FILL_URL = 'https://firefly-api-enterprise-stage.adobe.io/v3/images/fill'

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

// Uploads raw image binary to Firefly storage and returns the uploadId
async function uploadImage (imageBuffer, mimeType, accessToken, clientId) {
  const res = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'x-api-key': clientId,
      'Content-Type': mimeType,
      'Content-Length': imageBuffer.length
    },
    body: imageBuffer
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Firefly image upload failed (${res.status}): ${text}`)
  }

  const data = await res.json()
  const uploadId = data.images?.[0]?.id
  if (!uploadId) throw new Error('Upload succeeded but no uploadId returned')
  return uploadId
}

async function main (params) {
  const logger = Core.Logger('firefly-generative-fill', { level: params.LOG_LEVEL || 'info' })

  try {
    logger.info('Calling firefly-generative-fill action')
    logger.debug(stringParameters(params))

    const { imageBase64, maskBase64, prompt, mimeType } = params

    if (!imageBase64) return errorResponse(400, 'Missing required parameter: imageBase64', logger)
    if (!maskBase64) return errorResponse(400, 'Missing required parameter: maskBase64', logger)
    if (!prompt) return errorResponse(400, 'Missing required parameter: prompt', logger)

    const clientId = params.FIREFLY_CLIENT_ID
    const clientSecret = params.FIREFLY_CLIENT_SECRET
    const scopes = params.FIREFLY_SCOPES || 'openid,AdobeID,firefly_api,ff_apis'
    const imsTokenUrl = params.IMS_TOKEN_URL || 'https://ims-na1-stg1.adobelogin.com/ims/token/v3'

    if (!clientId || !clientSecret) {
      return errorResponse(500, 'Missing Firefly credentials (FIREFLY_CLIENT_ID / FIREFLY_CLIENT_SECRET)', logger)
    }

    const accessToken = await getAccessToken(imsTokenUrl, clientId, clientSecret, scopes)

    // Decode base64 strings to binary Buffers for upload
    const imageBuffer = Buffer.from(imageBase64, 'base64')
    const maskBuffer = Buffer.from(maskBase64, 'base64')

    logger.info('Uploading source image and mask to Firefly storage')
    const [sourceUploadId, maskUploadId] = await Promise.all([
      uploadImage(imageBuffer, mimeType || 'image/jpeg', accessToken, clientId),
      uploadImage(maskBuffer, 'image/png', accessToken, clientId)
    ])

    logger.info('Calling Firefly generative fill API')
    const requestBody = {
      prompt,
      image: {
        source: { uploadId: sourceUploadId },
        mask: { uploadId: maskUploadId }
      }
    }

    const fireflyRes = await fetch(FILL_URL, {
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
      throw new Error(`Firefly generative fill API failed (${fireflyRes.status}): ${text}`)
    }

    const result = await fireflyRes.json()
    logger.info('Generative fill response received')

    const imageUrl = result.outputs?.[0]?.image?.url
    if (!imageUrl) throw new Error('No image URL in Firefly response')

    return {
      statusCode: 200,
      body: { imageUrl }
    }
  } catch (error) {
    logger.error(error)
    return errorResponse(500, error.message, logger)
  }
}

exports.main = main
